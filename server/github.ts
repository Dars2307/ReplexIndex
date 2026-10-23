import type { DiscoverySearchResult, Repository, TrendingWindow } from '../src/types/index.ts';
import { classifyRepository } from '../src/engines/classification.ts';
import { evaluateAgentReadiness } from '../src/engines/readiness.ts';
import { canEncrypt, decryptSecret, sha256 } from './crypto.ts';
import { env } from './env.ts';
import { background, getAdmin, HttpError } from './supabase.ts';

const USER_AGENT = 'Replex/1.0 (+https://github.com/Dars2307/ReplexIndex)';
const FULL_NAME = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;

// "owner/repo" only — and never "." or ".." segments, which fetch() would
// normalise into a different GitHub API path.
export function isValidFullName(value: string): boolean {
  return FULL_NAME.test(value) && value.split('/').every((s) => !/^\.+$/.test(s));
}

const repoPath = (fullName: string) => fullName.split('/').map(encodeURIComponent).join('/');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isPublic = (item: any) => item && item.private !== true && (item.visibility === undefined || item.visibility === 'public');

// ---------------------------------------------------------------------------
// Cache: per-instance memory first, then Postgres so cold serverless
// instances share results.
// ---------------------------------------------------------------------------
const memory = new Map<string, { payload: unknown; expires: number }>();

export async function cacheGet<T>(key: string): Promise<T | null> {
  const hit = memory.get(key);
  if (hit && hit.expires > Date.now()) return hit.payload as T;
  const admin = getAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from('github_cache')
    .select('payload, expires_at')
    .eq('cache_key', key)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (!data) return null;
  memory.set(key, { payload: data.payload, expires: Date.parse(data.expires_at) });
  return data.payload as T;
}

export async function cacheSet(key: string, payload: unknown, ttlSeconds: number): Promise<void> {
  const expires = Date.now() + ttlSeconds * 1000;
  if (memory.size > 500) memory.clear();
  memory.set(key, { payload, expires });
  const admin = getAdmin();
  if (!admin) return;
  // The database is shared with other apps: occasionally drop expired rows.
  if (Math.random() < 0.02) background(admin.rpc('purge_expired'), 'cache purge');
  await admin
    .from('github_cache')
    .upsert({ cache_key: key, payload, fetched_at: new Date().toISOString(), expires_at: new Date(expires).toISOString() });
}

// ---------------------------------------------------------------------------
// Tokens: the caller's own GitHub token when we have it, else the server's.
// ---------------------------------------------------------------------------
export async function githubTokenFor(userId?: string): Promise<string> {
  const admin = getAdmin();
  if (userId && admin && canEncrypt()) {
    const { data } = await admin.from('user_github_tokens').select('token_ciphertext').eq('user_id', userId).maybeSingle();
    if (data?.token_ciphertext) {
      try {
        return decryptSecret(data.token_ciphertext);
      } catch {
        // Key rotated or row corrupted: fall through to the server token.
      }
    }
  }
  return env.githubToken;
}

let lastRateLimit = { limit: 0, remaining: 0, resetAt: '' };
export function lastGithubRateLimit() {
  return lastRateLimit;
}

async function request(path: string, token: string, accept = 'application/vnd.github+json'): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: accept,
    'User-Agent': USER_AGENT,
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(10_000) });
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining !== null) {
    const reset = Number(res.headers.get('x-ratelimit-reset') || 0);
    lastRateLimit = {
      limit: Number(res.headers.get('x-ratelimit-limit') || 0),
      remaining: Number(remaining),
      resetAt: reset ? new Date(reset * 1000).toISOString() : '',
    };
  }
  return res;
}

async function github(path: string, token: string, accept?: string): Promise<Response> {
  let res = await request(path, token, accept);
  // A user's token may have been revoked on GitHub; retry with the server token.
  if (res.status === 401 && token && token !== env.githubToken) {
    res = await request(path, env.githubToken, accept);
  }
  if (res.ok) return res;
  if (res.status === 404) throw new HttpError(404, 'Not found on GitHub', 'not_found');
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset');
    const when = reset ? new Date(Number(reset) * 1000).toLocaleTimeString('en-GB') : 'shortly';
    throw new HttpError(429, `GitHub rate limit reached — try again after ${when}`, 'github_rate_limited');
  }
  if (res.status === 422) throw new HttpError(400, 'GitHub could not parse that search', 'bad_query');
  throw new HttpError(502, `GitHub returned HTTP ${res.status}`, 'github_error');
}

// ---------------------------------------------------------------------------
// Mapping GitHub JSON -> Replex Repository (with purpose + readiness)
// ---------------------------------------------------------------------------
const FRAMEWORK_HINTS: [string, string][] = [
  ['next.js', 'Next.js'], ['nextjs', 'Next.js'], ['react', 'React'], ['vue', 'Vue'], ['svelte', 'Svelte'],
  ['angular', 'Angular'], ['tailwind', 'Tailwind CSS'], ['fastapi', 'FastAPI'], ['django', 'Django'],
  ['express', 'Express'], ['hono', 'Hono'], ['astro', 'Astro'], ['remix', 'Remix'], ['electron', 'Electron'],
  ['tauri', 'Tauri'], ['pytorch', 'PyTorch'], ['langchain', 'LangChain'],
];
const BUILD_HINTS: [string, string][] = [['vite', 'Vite'], ['turborepo', 'Turborepo'], ['webpack', 'Webpack'], ['cargo', 'Cargo']];

// The first install command the README actually documents. Never guessed from
// the repository name: "npm install next.js" is not how you install Next.js.
const INSTALL_LINE = new RegExp(
  String.raw`^\s*(?:\$\s*)?(` +
    // Scaffolders may stand alone ("npx create-next-app@latest")...
    String.raw`(?:npx (?:create-[\w.@/-]+|[\w.@/-]+@latest)|(?:npm|pnpm|yarn|bun) create [\w.@/-]+)(?: [^\n${'`'}|;&<>]{1,100})?` +
    // ...package installs always name what to install.
    String.raw`|(?:npm (?:i|install)|pnpm (?:add|i|install)|yarn add|bun add|pip3? install|uv (?:add|pip install)|pipx install|cargo (?:add|install)|go (?:get|install)|brew install|gem install|composer require|dotnet add package) [^\n${'`'}|;&<>]{1,120}` +
    String.raw`)\s*$`,
  'm',
);

function installCommandFor(readme: string): string {
  const match = readme.match(INSTALL_LINE);
  return match ? match[1].trim().replace(/\s+/g, ' ') : '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toRepository(data: any, readmeText = ''): Repository {
  const topics: string[] = Array.isArray(data.topics) ? data.topics : [];
  const primaryLanguage: string = data.language || 'Unknown';
  const description: string = data.description || '';
  const text = `${data.name} ${description} ${topics.join(' ')} ${readmeText}`.toLowerCase();

  const frameworks = [...new Set(FRAMEWORK_HINTS.filter(([k]) => text.includes(k)).map(([, v]) => v))];
  const buildTools = BUILD_HINTS.filter(([k]) => text.includes(k)).map(([, v]) => v);
  const runtimes: string[] = [];
  if (primaryLanguage === 'TypeScript' || primaryLanguage === 'JavaScript') runtimes.push('Node.js', 'Browser');
  if (primaryLanguage === 'Python') runtimes.push('Python 3');
  if (primaryLanguage === 'Rust') runtimes.push('Native (Rust)');
  if (primaryLanguage === 'Go') runtimes.push('Go runtime');

  const license = data.license
    ? { key: data.license.key, name: data.license.name, spdxId: data.license.spdx_id || 'NOASSERTION' }
    : null;
  const installCommand = installCommandFor(readmeText);
  const stackEvidence = {
    frameworks,
    buildTools,
    packageManagers: [] as string[],
    runtimes,
    keyDependencies: [] as string[],
    configFileDetected: [] as string[],
  };
  const now = new Date().toISOString();
  const purpose = classifyRepository({ name: data.name, description, topics, primaryLanguage, readmeText });
  const ageDays = (Date.now() - Date.parse(data.created_at)) / 86_400_000;
  const idleDays = (Date.now() - Date.parse(data.pushed_at)) / 86_400_000;
  purpose.maturitySignals.status = data.archived
    ? 'archived'
    : ageDays < 90
      ? 'experimental'
      : idleDays < 60
        ? 'active_development'
        : 'stable';
  purpose.maturitySignals.releaseCadence =
    idleDays < 7 ? 'Pushed this week' : idleDays < 30 ? 'Pushed this month' : idleDays < 365 ? 'Pushed this year' : 'No pushes in over a year';

  return {
    id: data.full_name,
    name: data.name,
    fullName: data.full_name,
    owner: {
      login: data.owner?.login || data.full_name.split('/')[0],
      avatarUrl: data.owner?.avatar_url || `https://github.com/${data.full_name.split('/')[0]}.png`,
      htmlUrl: data.owner?.html_url || `https://github.com/${data.full_name.split('/')[0]}`,
    },
    htmlUrl: data.html_url,
    description,
    homepageUrl: data.homepage || null,
    primaryLanguage,
    languages: [primaryLanguage],
    topics,
    stars: data.stargazers_count || 0,
    forks: data.forks_count || 0,
    openIssues: data.open_issues_count || 0,
    license,
    isArchived: Boolean(data.archived),
    isTemplate: Boolean(data.is_template),
    visibility: 'public',
    sourceProvider: 'github',
    createdAt: data.created_at,
    pushedAt: data.pushed_at,
    lastUpstreamUpdate: data.updated_at,
    discoveredAt: now,
    lastIndexedAt: now,
    lastClassifiedAt: now,
    purpose,
    agentReadiness: evaluateAgentReadiness({
      license,
      isArchived: Boolean(data.archived),
      pushedAt: data.pushed_at,
      primaryLanguage,
      readmeExtract: readmeText,
      installCommand,
      stackEvidence,
    }),
    stackEvidence,
    relationships: [],
    readmeExtract: readmeText || undefined,
    readmeUrl: `https://github.com/${data.full_name}#readme`,
    installCommand,
  };
}

function indexRepositories(repos: Repository[]): void {
  const admin = getAdmin();
  if (!admin || repos.length === 0) return;
  const rows = repos.map((r) => ({
    full_name: r.fullName,
    description: r.description.slice(0, 500),
    language: r.primaryLanguage,
    topics_text: r.topics.join(' '),
    stars: r.stars,
    pushed_at: r.pushedAt,
    upstream_created_at: r.createdAt,
    data: r,
    indexed_at: new Date().toISOString(),
  }));
  background(admin.from('repos').upsert(rows, { onConflict: 'full_name' }), 'repository index');
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
export interface DiscoveryQuery {
  q: string;
  language?: string;
  topic?: string;
  sort?: 'best' | 'stars' | 'updated' | 'forks';
  createdWithinDays?: number;
  pushedWithinDays?: number;
  minStars?: number;
  includeArchived?: boolean;
  page?: number;
  perPage?: number;
}

const QUALIFIER_SAFE = /^[A-Za-z0-9 #+._-]{1,50}$/;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

export function buildGithubQuery(query: DiscoveryQuery): string {
  const parts: string[] = [];
  const text = query.q.replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
  if (text) parts.push(text);
  if (query.language && QUALIFIER_SAFE.test(query.language)) parts.push(`language:"${query.language}"`);
  if (query.topic && QUALIFIER_SAFE.test(query.topic)) parts.push(`topic:${query.topic.toLowerCase().replace(/\s+/g, '-')}`);
  if (query.createdWithinDays) parts.push(`created:>${isoDaysAgo(query.createdWithinDays)}`);
  if (query.pushedWithinDays) parts.push(`pushed:>${isoDaysAgo(query.pushedWithinDays)}`);
  if (query.minStars && query.minStars > 0) parts.push(`stars:>=${Math.floor(query.minStars)}`);
  if (!query.includeArchived) parts.push('archived:false');
  parts.push('fork:false', 'is:public');
  if (!text && !query.language && !query.topic && !query.createdWithinDays) parts.push('stars:>1000');
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Search quality: spam and relevance
// ---------------------------------------------------------------------------
// GitHub's editor caps descriptions at 350 characters, but some repositories
// carry 25,000-65,000 character descriptions (pasted READMEs, political
// tracts) that match almost any keywords and so rank for everything.
const MAX_DESCRIPTION = 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isKeywordStuffed(item: any): boolean {
  return typeof item?.description === 'string' && item.description.length > MAX_DESCRIPTION;
}

const STOP_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'with', 'in', 'of', 'to', 'on', 'my', 'app']);

/** Words of the free-text query worth matching (qualifiers like language:x are skipped). */
export function queryTerms(text: string): string[] {
  return [...new Set(text.toLowerCase().split(/\s+/))]
    .filter((w) => !w.includes(':'))
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

/**
 * Best-match only: repositories whose name, description and topics contain none
 * of the search words (GitHub matched them on something else) move below the
 * ones that do. Order is otherwise GitHub's.
 */
export function demoteUnrelated(items: Repository[], text: string): Repository[] {
  const terms = queryTerms(text);
  if (!terms.length) return items;
  const related = (r: Repository) => {
    const haystack = `${r.fullName} ${r.description} ${r.topics.join(' ')}`.toLowerCase();
    return terms.some((t) => haystack.includes(t));
  };
  return [...items.filter(related), ...items.filter((r) => !related(r))];
}

export async function searchGithub(query: DiscoveryQuery, token: string): Promise<DiscoverySearchResult> {
  const page = Math.min(Math.max(1, Math.floor(query.page || 1)), 10);
  const perPage = Math.min(Math.max(1, Math.floor(query.perPage || 24)), 50);
  const q = buildGithubQuery(query);
  const sort = query.sort && query.sort !== 'best' ? query.sort : '';
  // v2: results filtered for keyword stuffing; older cached pages may contain spam.
  const key = `search:v2:${sha256(JSON.stringify([q, sort, page, perPage]))}`;

  const cached = await cacheGet<DiscoverySearchResult>(key);
  if (cached) return cached;

  const params = new URLSearchParams({ q, per_page: String(perPage), page: String(page) });
  if (sort) params.set('sort', sort);
  let json = await (await github(`/search/repositories?${params}`, token)).json();
  // GitHub's search times out under load and answers "0 results", then keeps
  // serving that empty page from its own cache for the same parameters. Retry
  // once with a no-op parameter (order is ignored without sort; with sort,
  // desc is the default) so the request misses that cache.
  if (!json.items?.length && !params.has('order')) {
    params.set('order', 'desc');
    json = await (await github(`/search/repositories?${params}`, token)).json();
  }
  // Results are cached for everyone and indexed publicly, so never let a
  // private repository through, whatever scopes the token happens to have.
  const found: Repository[] = (json.items || [])
    .filter((item: unknown) => isPublic(item) && !isKeywordStuffed(item))
    .map((item: unknown) => toRepository(item));
  const items = sort ? found : demoteUnrelated(found, query.q);
  const result: DiscoverySearchResult = {
    query: q,
    total: Math.min(json.total_count || 0, 1000),
    incomplete: Boolean(json.incomplete_results),
    page,
    perPage,
    items,
  };
  // Keep empty or partial answers briefly so a GitHub hiccup isn't served for ten minutes.
  await cacheSet(key, result, items.length && !result.incomplete ? 600 : 60);
  indexRepositories(items);
  return result;
}

// ---------------------------------------------------------------------------
// Trending, derived from GitHub search (GitHub has no trending API, and the
// OSS Insight event ranking has been unavailable since March 2026):
//  - rising:   created inside the window, ranked by stars
//  - breakout: created in the last 90 days and already past 1,000 stars
// ---------------------------------------------------------------------------
const WINDOW_DAYS: Record<TrendingWindow, number> = { day: 2, week: 7, month: 30 };
const WINDOW_MIN_STARS: Record<TrendingWindow, number> = { day: 10, week: 50, month: 150 };

export async function risingRepositories(
  window: TrendingWindow,
  options: { language?: string; topic?: string },
  token: string,
): Promise<Repository[]> {
  const result = await searchGithub(
    {
      q: '',
      language: options.language,
      topic: options.topic,
      createdWithinDays: WINDOW_DAYS[window],
      minStars: WINDOW_MIN_STARS[window],
      sort: 'stars',
      perPage: 30,
    },
    token,
  );
  return result.items;
}

export async function breakoutRepositories(
  options: { language?: string; topic?: string },
  token: string,
): Promise<Repository[]> {
  const result = await searchGithub(
    { q: '', language: options.language, topic: options.topic, createdWithinDays: 90, minStars: 1000, sort: 'stars', perPage: 30 },
    token,
  );
  return result.items;
}

// ---------------------------------------------------------------------------
// Repository detail: metadata + README extract + latest release
// ---------------------------------------------------------------------------
export async function getRepository(fullName: string, token: string): Promise<Repository> {
  if (!isValidFullName(fullName)) throw new HttpError(400, 'Use the "owner/repo" format', 'bad_repo');
  const key = `repo:${fullName.toLowerCase()}`;
  const cached = await cacheGet<Repository>(key);
  if (cached) return cached;

  const res = await github(`/repos/${repoPath(fullName)}`, token);
  const data = await res.json();
  if (!data?.full_name || !isValidFullName(data.full_name) || !isPublic(data)) {
    throw new HttpError(404, 'Replex only shows public repositories', 'not_found');
  }

  let readme = '';
  let latestRelease: Repository['latestRelease'] = null;
  const [readmeRes, releaseRes] = await Promise.allSettled([
    github(`/repos/${repoPath(data.full_name)}/readme`, token, 'application/vnd.github.raw+json'),
    github(`/repos/${repoPath(data.full_name)}/releases/latest`, token),
  ]);
  if (readmeRes.status === 'fulfilled') readme = (await readmeRes.value.text()).slice(0, 4000);
  if (releaseRes.status === 'fulfilled') {
    const rel = await releaseRes.value.json();
    latestRelease = { tag: rel.tag_name, name: rel.name || null, publishedAt: rel.published_at, url: rel.html_url };
  }

  const repo = { ...toRepository(data, readme), latestRelease };
  await cacheSet(key, repo, 6 * 3600);
  indexRepositories([repo]);
  return repo;
}

// ---------------------------------------------------------------------------
// Health signals: facts from GitHub that an AI review is grounded in
// ---------------------------------------------------------------------------
export interface HealthSignals {
  /** CI check runs on the default branch's latest commit; null when none were found */
  checks: { total: number; passed: number; failed: number; pending: number; failing: string[] } | null;
  lastCommitAt: string | null;
  /** Open issues labelled "bug"; null when GitHub search was unavailable */
  openBugs: number | null;
  /** Most-discussed open issues (titles are third-party text) */
  topIssues: { title: string; comments: number; labels: string[]; url: string }[];
}

export async function getHealthSignals(fullName: string, token: string): Promise<HealthSignals> {
  if (!isValidFullName(fullName)) throw new HttpError(400, 'Use the "owner/repo" format', 'bad_repo');
  const key = `health:${fullName.toLowerCase()}`;
  const cached = await cacheGet<HealthSignals>(key);
  if (cached) return cached;

  const path = repoPath(fullName);
  const json = async (p: string) => (await github(p, token)).json();
  // HEAD resolves to the default branch, so no extra call to look it up.
  const [checksRes, commitsRes, bugsRes, issuesRes] = await Promise.allSettled([
    json(`/repos/${path}/commits/HEAD/check-runs?per_page=100`),
    json(`/repos/${path}/commits?per_page=1`),
    json(`/search/issues?${new URLSearchParams({ q: `repo:${fullName} is:issue is:open label:bug`, per_page: '1' })}`),
    json(`/repos/${path}/issues?state=open&sort=comments&direction=desc&per_page=20`),
  ]);

  let checks: HealthSignals['checks'] = null;
  if (checksRes.status === 'fulfilled' && Array.isArray(checksRes.value?.check_runs) && checksRes.value.check_runs.length) {
    const runs: { name: string; status: string; conclusion: string | null }[] = checksRes.value.check_runs;
    const failedRuns = runs.filter((r) => ['failure', 'timed_out', 'action_required', 'startup_failure'].includes(r.conclusion ?? ''));
    checks = {
      total: runs.length,
      passed: runs.filter((r) => ['success', 'neutral', 'skipped'].includes(r.conclusion ?? '')).length,
      failed: failedRuns.length,
      pending: runs.filter((r) => r.status !== 'completed').length,
      failing: [...new Set(failedRuns.map((r) => String(r.name).slice(0, 80)))].slice(0, 5),
    };
  }
  const commit = commitsRes.status === 'fulfilled' && Array.isArray(commitsRes.value) ? commitsRes.value[0] : null;
  const signals: HealthSignals = {
    checks,
    lastCommitAt: commit?.commit?.committer?.date ?? commit?.commit?.author?.date ?? null,
    openBugs: bugsRes.status === 'fulfilled' && typeof bugsRes.value?.total_count === 'number' ? bugsRes.value.total_count : null,
    topIssues:
      issuesRes.status === 'fulfilled' && Array.isArray(issuesRes.value)
        ? issuesRes.value
            .filter((i: { pull_request?: unknown }) => !i.pull_request)
            .slice(0, 10)
            .map((i: { title: string; comments: number; labels: { name: string }[]; html_url: string }) => ({
              title: String(i.title).slice(0, 160),
              comments: i.comments,
              labels: (i.labels || []).map((l) => String(l.name).slice(0, 40)).slice(0, 4),
              url: i.html_url,
            }))
        : [],
  };
  await cacheSet(key, signals, 3 * 3600);
  return signals;
}
