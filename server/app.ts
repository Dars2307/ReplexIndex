import express, { type NextFunction, type Request, type Response } from 'express';
import type { TrendingWindow } from '../src/types/index.ts';
import { evaluateCompatibility } from '../src/engines/compatibility.ts';
import { AI_DAILY_LIMIT, aiConfigured, aiSearchesToday, smartSearch } from './ai.ts';
import { authenticate } from './auth.ts';
import { canEncrypt, encryptSecret, mintApiKey } from './crypto.ts';
import { env, supabaseConfigured } from './env.ts';
import {
  breakoutRepositories,
  getRepository,
  githubTokenFor,
  isValidFullName,
  lastGithubRateLimit,
  risingRepositories,
  searchGithub,
  type DiscoveryQuery,
} from './github.ts';
import { recordSearch, targetStackFor } from './library.ts';
import { mcpHandler, SERVER_INFO, TOOLS } from './mcp.ts';
import { HttpError, requireAdmin } from './supabase.ts';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '64kb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // The API authenticates with bearer tokens only (no cookies), so permissive
  // CORS cannot be used for CSRF. Account routes still pin the app origin.
  const origin = req.path.toLowerCase().startsWith('/api/v1/me') ? env.appUrl : '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key, Mcp-Protocol-Version, Mcp-Session-Id');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

type Handler = (req: Request, res: Response) => Promise<unknown>;
const route = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

const text = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
};
const windowOf = (v: unknown): TrendingWindow => (v === 'day' || v === 'month' ? v : 'week');

// Signed-out traffic shares the server's GitHub quota, so throttle it per IP.
// In-memory and per instance: a first line of defence; production should also
// add a Vercel Firewall rate-limit rule on /api/v1/*.
const ANON_PER_MINUTE = 40;
const anonHits = new Map<string, { windowStart: number; count: number }>();
function throttleAnonymous(req: Request, _res: Response, next: NextFunction) {
  if (req.caller) return next();
  const now = Date.now();
  const key = req.ip || 'unknown';
  const entry = anonHits.get(key);
  if (!entry || now - entry.windowStart >= 60_000) {
    if (anonHits.size > 10_000) anonHits.clear();
    anonHits.set(key, { windowStart: now, count: 1 });
    return next();
  }
  entry.count += 1;
  if (entry.count > ANON_PER_MINUTE) {
    return next(new HttpError(429, 'Too many requests — sign in for higher limits, or try again in a minute', 'rate_limited'));
  }
  next();
}

// The user's GitHub identity as recorded by Supabase Auth (not user-editable
// metadata, which any account can change with auth.updateUser).
async function githubIdentity(userId: string): Promise<{ id: string; login: string; name?: string; avatar?: string } | null> {
  const { data } = await requireAdmin().auth.admin.getUserById(userId);
  const identity = data.user?.identities?.find((i) => i.provider === 'github');
  if (!identity) return null;
  const d = (identity.identity_data ?? {}) as Record<string, unknown>;
  const id = String(d.provider_id ?? d.sub ?? identity.id ?? '');
  const login = String(d.user_name ?? d.preferred_username ?? '');
  if (!id || !login) return null;
  return { id, login, name: (d.full_name ?? d.name) as string | undefined, avatar: d.avatar_url as string | undefined };
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    service: SERVER_INFO.title,
    version: SERVER_INFO.version,
    accounts: supabaseConfigured,
    serverGithubToken: Boolean(env.githubToken),
    tokenEncryption: canEncrypt(),
    aiSearch: aiConfigured(),
    githubRateLimit: lastGithubRateLimit(),
  });
});

// ---------------------------------------------------------------------------
// Discovery (public; recorded to history when signed in)
// ---------------------------------------------------------------------------
app.get(
  '/api/v1/discover/search',
  authenticate('optional', 'search:read'),
  throttleAnonymous,
  route(async (req, res) => {
    const sort = text(req.query.sort, 10);
    const query: DiscoveryQuery = {
      q: text(req.query.q),
      language: text(req.query.language, 50) || undefined,
      topic: text(req.query.topic, 50) || undefined,
      sort: (['stars', 'updated', 'forks'].includes(sort) ? sort : 'best') as DiscoveryQuery['sort'],
      createdWithinDays: int(req.query.created),
      pushedWithinDays: int(req.query.pushed),
      minStars: int(req.query.minStars),
      page: int(req.query.page),
      perPage: int(req.query.perPage),
    };
    const result = await searchGithub(query, await githubTokenFor(req.caller?.userId));
    if (req.caller && query.q && (query.page ?? 1) === 1) {
      recordSearch(req.caller.userId, query.q, { ...query, page: undefined, perPage: undefined }, req.caller.via === 'session' ? 'web' : 'api', result.total);
    }
    res.setHeader('Cache-Control', req.caller ? 'private, no-store' : 'public, s-maxage=300, stale-while-revalidate=600');
    res.json(result);
  }),
);

app.get(
  '/api/v1/discover/trending',
  authenticate('optional', 'search:read'),
  throttleAnonymous,
  route(async (req, res) => {
    const window = windowOf(req.query.window);
    const language = text(req.query.language, 50) || undefined;
    const topic = text(req.query.topic, 50) || undefined;
    const token = await githubTokenFor(req.caller?.userId);
    const [rising, breakout] = await Promise.all([
      risingRepositories(window, { language, topic }, token),
      breakoutRepositories({ language, topic }, token),
    ]);
    res.setHeader('Cache-Control', req.caller ? 'private, no-store' : 'public, s-maxage=900, stale-while-revalidate=3600');
    res.json({ window, rising, breakout });
  }),
);

app.get(
  '/api/v1/repos/:owner/:repo',
  authenticate('optional', 'repositories:read'),
  throttleAnonymous,
  route(async (req, res) => {
    const fullName = `${req.params.owner}/${req.params.repo}`;
    if (!isValidFullName(fullName)) throw new HttpError(400, 'Use the "owner/repo" format');
    const repo = await getRepository(fullName, await githubTokenFor(req.caller?.userId));
    const stack = text(req.query.stack) || (req.caller ? await targetStackFor(req.caller.userId) : '');
    res.json({ repository: repo, compatibility: stack ? evaluateCompatibility(repo, stack) : null });
  }),
);

app.post(
  '/api/v1/compare',
  authenticate('optional', 'repositories:read'),
  throttleAnonymous,
  route(async (req, res) => {
    const names: string[] = Array.isArray(req.body?.fullNames) ? req.body.fullNames.slice(0, 4).map((n: unknown) => text(n, 201)) : [];
    if (names.length < 2 || !names.every(isValidFullName)) throw new HttpError(400, 'Send 2–4 repositories as "owner/repo"');
    const token = await githubTokenFor(req.caller?.userId);
    const stack = text(req.body?.targetStack) || (req.caller ? await targetStackFor(req.caller.userId) : '');
    const repos = await Promise.all(names.map((n) => getRepository(n, token)));
    res.json({
      targetStack: stack || null,
      repositories: repos.map((r) => ({ repository: r, compatibility: stack ? evaluateCompatibility(r, stack) : null })),
    });
  }),
);

// ---------------------------------------------------------------------------
// AI smart search (Gemini). Signed-in only and capped per user per day so the
// free tier can't be drained.
// ---------------------------------------------------------------------------
app.get(
  '/api/v1/ai/status',
  authenticate('optional'),
  route(async (req, res) => {
    const used = req.caller ? await aiSearchesToday(req.caller.userId) : 0;
    res.json({ enabled: aiConfigured(), signedIn: Boolean(req.caller), limit: AI_DAILY_LIMIT, remaining: Math.max(0, AI_DAILY_LIMIT - used) });
  }),
);

app.post(
  '/api/v1/ai/search',
  authenticate('required', 'search:read'),
  route(async (req, res) => {
    const prompt = text(req.body?.prompt, 400);
    if (prompt.length < 3) throw new HttpError(400, 'Describe what you are looking for in a few words');
    const used = await aiSearchesToday(req.caller!.userId);
    if (used >= AI_DAILY_LIMIT) {
      throw new HttpError(429, `You've used all ${AI_DAILY_LIMIT} AI searches for today — regular search is unlimited`, 'ai_daily_limit');
    }
    const result = await smartSearch(prompt, await githubTokenFor(req.caller!.userId));
    recordSearch(req.caller!.userId, prompt, { mode: 'ai' }, req.caller!.via === 'session' ? 'web' : 'api', result.results.length);
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ ...result, remaining: Math.max(0, AI_DAILY_LIMIT - used - 1) });
  }),
);

// ---------------------------------------------------------------------------
// Account (signed-in browser session only)
// ---------------------------------------------------------------------------
app.post(
  '/api/v1/me/github-token',
  authenticate('required'),
  route(async (req, res) => {
    if (req.caller!.via !== 'session') throw new HttpError(403, 'Session required');
    const token = text(req.body?.providerToken, 500);
    if (!token) throw new HttpError(400, 'providerToken is required');
    if (!canEncrypt()) return res.json({ stored: false, reason: 'Server token encryption is not configured' });

    // Only store a token that belongs to the GitHub identity linked to this
    // account, matched by GitHub's immutable numeric user id.
    const admin = requireAdmin();
    const identity = await githubIdentity(req.caller!.userId);
    if (!identity) throw new HttpError(403, 'This account has no linked GitHub identity');
    const ghRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Replex/1.0' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!ghRes.ok) throw new HttpError(400, 'GitHub did not accept this token');
    const ghUser = await ghRes.json();
    if (String(ghUser.id) !== identity.id) {
      throw new HttpError(403, 'Token does not belong to your GitHub account');
    }
    const { error } = await admin
      .from('user_github_tokens')
      .upsert({ user_id: req.caller!.userId, token_ciphertext: encryptSecret(token), updated_at: new Date().toISOString() });
    if (error) throw new HttpError(500, 'Could not store token');
    res.json({ stored: true });
  }),
);

app.post(
  '/api/v1/me/keys',
  authenticate('session-only', 'keys:manage'),
  route(async (req, res) => {
    const name = text(req.body?.name, 80);
    if (!name) throw new HttpError(400, 'Give the key a name, e.g. "Claude Desktop"');
    const admin = requireAdmin();
    const { count } = await admin
      .from('api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.caller!.userId)
      .is('revoked_at', null);
    if ((count ?? 0) >= 10) throw new HttpError(400, 'You can have up to 10 active keys. Revoke one first.');
    const key = mintApiKey();
    const { data, error } = await admin
      .from('api_keys')
      .insert({ user_id: req.caller!.userId, name, prefix: key.prefix, key_hash: key.hash })
      .select('id, name, prefix, scopes, created_at, last_used_at, revoked_at')
      .single();
    if (error) throw new HttpError(500, 'Could not create key');
    res.status(201).json({ key: key.raw, record: data });
  }),
);

app.delete(
  '/api/v1/me/keys/:id',
  authenticate('session-only', 'keys:manage'),
  route(async (req, res) => {
    const { data, error } = await requireAdmin()
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.caller!.userId)
      .is('revoked_at', null)
      .select('id')
      .maybeSingle();
    if (error) throw new HttpError(500, 'Could not revoke key');
    if (!data) throw new HttpError(404, 'Key not found');
    res.json({ revoked: data.id });
  }),
);

// Creates this user's Replex profile on first sign-in. Auth is shared with the
// user's other apps in the same Supabase project, so profiles are created by
// Replex on demand rather than by a trigger on auth.users.
app.post(
  '/api/v1/me/bootstrap',
  authenticate('session-only'),
  route(async (req, res) => {
    const admin = requireAdmin();
    const identity = await githubIdentity(req.caller!.userId);
    const { error } = await admin.from('profiles').upsert(
      {
        id: req.caller!.userId,
        github_login: identity?.login ?? null,
        display_name: identity?.name || identity?.login || null,
        avatar_url: identity?.avatar ?? null,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (error) throw new HttpError(500, 'Could not create profile');
    const { data: profile } = await admin.from('profiles').select('*').eq('id', req.caller!.userId).single();
    res.json({ profile });
  }),
);

// Deletes everything Replex stores for this user. The shared sign-in account
// itself is left intact because the user's other apps rely on it.
app.delete(
  '/api/v1/me/data',
  authenticate('session-only'),
  route(async (req, res) => {
    const admin = requireAdmin();
    const uid = req.caller!.userId;
    for (const table of ['agent_events', 'searches', 'collections', 'watchlists', 'api_keys', 'user_github_tokens']) {
      const { error } = await admin.from(table).delete().eq('user_id', uid);
      if (error) throw new HttpError(500, `Could not delete ${table}`);
    }
    const { error } = await admin.from('profiles').delete().eq('id', uid);
    if (error) throw new HttpError(500, 'Could not delete profile');
    res.json({ deleted: true });
  }),
);

// ---------------------------------------------------------------------------
// MCP (Streamable HTTP). Authenticated with a personal API key.
// ---------------------------------------------------------------------------
app.get('/api/v1/mcp/tools', (_req, res) => {
  res.json({
    server: SERVER_INFO,
    tools: TOOLS.map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema })),
  });
});

for (const path of ['/api/mcp', '/api/v1/mcp']) {
  app.post(path, authenticate('required', 'mcp:invoke'), route(mcpHandler));
  app.get(path, (_req, res) => res.status(405).setHeader('Allow', 'POST').json({ error: 'Use POST (Streamable HTTP, JSON responses)' }));
  app.delete(path, (_req, res) => res.status(405).setHeader('Allow', 'POST').end());
}

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  // body-parser errors carry their own 4xx status (413 too large, 400 bad JSON).
  const parserType = (err as { type?: string })?.type;
  const parserStatus = Number((err as { status?: number })?.status);
  const isParserError = typeof parserType === 'string' && parserStatus >= 400 && parserStatus < 500;
  const status = err instanceof HttpError ? err.status : isParserError ? parserStatus : 500;
  const message =
    err instanceof HttpError
      ? err.message
      : parserType === 'entity.too.large'
        ? 'Request body too large'
        : isParserError
          ? 'Request body is not valid JSON'
          : 'Something went wrong';
  if (status >= 500) console.error('[replex]', req.method, req.path, err);
  if (status === 401) res.setHeader('WWW-Authenticate', 'Bearer realm="replex"');
  if (req.body?.jsonrpc === '2.0' && req.path.endsWith('/mcp')) {
    return res.status(status).json({ jsonrpc: '2.0', id: req.body.id ?? null, error: { code: -32001, message } });
  }
  res.status(status).json({ error: message, code: err instanceof HttpError ? err.code : 'internal' });
});
