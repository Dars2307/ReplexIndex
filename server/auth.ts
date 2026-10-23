import type { NextFunction, Request, Response } from 'express';
import { looksLikeApiKey, sha256 } from './crypto.ts';
import { background, getAdmin, HttpError, requireAdmin } from './supabase.ts';

export interface Caller {
  userId: string;
  via: 'session' | 'api_key';
  apiKeyId?: string;
  scopes: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      caller?: Caller;
    }
  }
}

const SESSION_SCOPES = ['search:read', 'repositories:read', 'library:read', 'library:write', 'keys:manage', 'mcp:invoke'];
/** Everything an API key (an agent) may do: read only, whatever older keys have stored. */
export const API_KEY_SCOPES = ['search:read', 'repositories:read', 'library:read', 'mcp:invoke'];
const API_KEY_CALLS_PER_MINUTE = 60;

function bearer(req: Request): string | null {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim() || null;
  const apiKey = req.headers['x-api-key'];
  return typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : null;
}

async function callerFromApiKey(raw: string): Promise<Caller> {
  const admin = requireAdmin();
  const { data, error } = await admin
    .from('api_keys')
    .select('id, user_id, scopes, revoked_at, last_used_at')
    .eq('key_hash', sha256(raw))
    .maybeSingle();
  if (error) throw new HttpError(500, 'Could not verify API key');
  if (!data || data.revoked_at) throw new HttpError(401, 'Invalid or revoked API key', 'invalid_api_key');

  // Atomic per-minute counter covering every API-key request (REST and MCP).
  // Fail closed: if usage can't be metered, the request is refused.
  const { data: used, error: usageError } = await admin.rpc('hit_api_key', { p_key: data.id });
  if (usageError) throw new HttpError(503, 'Rate limiter unavailable — try again shortly', 'rate_limiter_unavailable');
  if (Number(used) > API_KEY_CALLS_PER_MINUTE) {
    throw new HttpError(429, `Rate limit: ${API_KEY_CALLS_PER_MINUTE} calls per minute per key`, 'rate_limited');
  }

  // Throttle last_used_at writes to once a minute per key.
  if (!data.last_used_at || Date.parse(data.last_used_at) < Date.now() - 60_000) {
    background(admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id), 'api key last_used_at');
  }
  const scopes = ((data.scopes ?? []) as string[]).filter((s) => API_KEY_SCOPES.includes(s));
  return { userId: data.user_id, via: 'api_key', apiKeyId: data.id, scopes };
}

async function callerFromSession(jwt: string): Promise<Caller> {
  const { data, error } = await requireAdmin().auth.getUser(jwt);
  if (error || !data.user) throw new HttpError(401, 'Session expired — sign in again', 'invalid_session');
  return { userId: data.user.id, via: 'session', scopes: SESSION_SCOPES };
}

export async function resolveCaller(req: Request): Promise<Caller | null> {
  const token = bearer(req);
  if (!token) return null;
  return looksLikeApiKey(token) ? callerFromApiKey(token) : callerFromSession(token);
}

type Mode = 'required' | 'optional' | 'session-only';

export function authenticate(mode: Mode, scope?: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (mode === 'optional' && !getAdmin()) return next();
      const caller = await resolveCaller(req);
      if (!caller) {
        if (mode === 'optional') return next();
        throw new HttpError(401, 'Sign in or pass an API key (Authorization: Bearer rpx_…)', 'unauthenticated');
      }
      if (mode === 'session-only' && caller.via !== 'session') {
        throw new HttpError(403, 'This action requires a signed-in browser session', 'session_required');
      }
      if (scope && !caller.scopes.includes(scope)) {
        throw new HttpError(403, `API key is missing the "${scope}" scope`, 'insufficient_scope');
      }
      req.caller = caller;
      next();
    } catch (err) {
      next(err);
    }
  };
}
