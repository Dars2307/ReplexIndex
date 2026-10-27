import { cacheGet, cacheSet, repoStatus } from './github.ts';

// Package health check for agents: before adding a dependency, does the npm or
// PyPI package exist, is it deprecated or archived, and is it still maintained?
// Facts come from the live registries and GitHub; nothing here is guessed.

export type Ecosystem = 'npm' | 'pypi';

// dormant: no release for 3+ years while the repository stays active (often
// renamed or superseded, though finished libraries land here too).
export type PackageVerdict = 'ok' | 'missing' | 'deprecated' | 'archived' | 'stale' | 'dormant' | 'unknown';

export interface PackageCheck {
  ecosystem: Ecosystem;
  name: string;
  verdict: PackageVerdict;
  reason: string;
  latestVersion: string | null;
  lastReleaseAt: string | null;
  weeklyDownloads: number | null;
  deprecationNotice: string | null;
  repository: string | null;
  repositoryArchived: boolean | null;
  lastCommitAt: string | null;
  registryUrl: string | null;
}

type Facts = Omit<PackageCheck, 'verdict' | 'reason'>;

const YEAR = 365 * 24 * 3600 * 1000;
const UA = { 'User-Agent': 'Replex/1.0 (+https://github.com/Dars2307/ReplexIndex)' };

// Python standard-library modules have ancient look-alike packages on PyPI.
const PYTHON_STDLIB = new Set(['argparse', 'asyncio', 'json', 'csv', 'sqlite3', 'logging', 'unittest', 'dataclasses', 'typing', 'urllib', 'http', 'datetime', 'pathlib', 'enum']);

// Real projects that deliberately don't publish to npm.
const GITHUB_ONLY: Record<string, string> = { 'uwebsockets.js': 'uNetworking/uWebSockets.js' };

// Deprecation notices and repository descriptions are written by package
// authors and reach coding agents verbatim: flatten them to one line and quote
// them so they read as evidence, not as instructions.
const CONTROL_CHARS = /[\u0000-\u001f\u007f\u2028\u2029]+/g;
export const quote = (text: string, max: number) =>
  `"${text.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim().slice(0, max).replace(/"/g, "'")}"`;

const NPM_NAME = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i;
const PYPI_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;

/** "react@18", "requests==2.31", "Flask>=2" → the bare package name, or null if it isn't a valid name. */
export function normalizePackageName(ecosystem: Ecosystem, raw: string): string | null {
  let name = String(raw).trim();
  if (ecosystem === 'npm') name = name.replace(/^npm:/i, '').replace(/(.)@[^/@]*$/, '$1');
  else name = name.replace(/^pip:/i, '').replace(/\s*\[.*$/, '').replace(/\s*[=<>!~;].*$/, '');
  if (!name || name.length > 214) return null;
  return (ecosystem === 'npm' ? NPM_NAME : PYPI_NAME).test(name) ? name : null;
}

async function getJson(url: string, maxBytes = 2_000_000, headers: Record<string, string> = {}): Promise<{ status: number; body: any }> {
  try {
    const res = await fetch(url, { headers: { ...UA, ...headers }, signal: AbortSignal.timeout(8000) });
    if (!res.ok || !res.body) return { status: res.status, body: null };
    // Read with a size cap: some packuments are tens of megabytes.
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return { status: 413, body: null };
      }
      chunks.push(value);
    }
    return { status: res.status, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
  } catch {
    return { status: 0, body: null };
  }
}

function githubRepoFrom(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const short = url.match(/^(?:github:)?([\w.-]+)\/([\w.-]+)$/i);
  if (short) return `${short[1]}/${short[2]}`;
  const m = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/#?].*)?$/i);
  return m ? `${m[1]}/${m[2]}` : null;
}

const empty = (ecosystem: Ecosystem, name: string): Facts => ({
  ecosystem,
  name,
  latestVersion: null,
  lastReleaseAt: null,
  weeklyDownloads: null,
  deprecationNotice: null,
  repository: null,
  repositoryArchived: null,
  lastCommitAt: null,
  registryUrl: null,
});

async function npmFacts(name: string): Promise<Facts | null> {
  const path = name.replace('/', '%2F');
  let latest = await getJson(`https://registry.npmjs.org/${path}/latest`);
  if (latest.status === 404) {
    // A package published only under another tag (npm publish --tag beta) has
    // no "latest" but does exist: ask for the compact packument instead.
    const doc = await getJson(`https://registry.npmjs.org/${path}`, 3_000_000, { Accept: 'application/vnd.npm.install-v1+json' });
    if (doc.status === 404) return null;
    const tag = Object.values(doc.body?.['dist-tags'] ?? {})[0];
    latest = { status: doc.status, body: typeof tag === 'string' ? (doc.body.versions?.[tag] ?? null) : null };
  }
  const facts = empty('npm', name);
  facts.registryUrl = `https://www.npmjs.com/package/${name}`;
  if (!latest.body) return facts;
  facts.latestVersion = latest.body.version ?? null;
  facts.deprecationNotice =
    typeof latest.body.deprecated === 'string' && latest.body.deprecated.trim() ? `npm deprecation notice from the maintainers: ${quote(latest.body.deprecated, 300)}` : null;
  const repoField = latest.body.repository;
  facts.repository = githubRepoFrom(typeof repoField === 'string' ? repoField : repoField?.url);

  const [search, downloads] = await Promise.all([
    getJson(`https://registry.npmjs.org/-/v1/search?${new URLSearchParams({ text: name, size: '20' })}`),
    getJson(`https://api.npmjs.org/downloads/point/last-week/${name}`),
  ]);
  facts.weeklyDownloads = typeof downloads.body?.downloads === 'number' ? downloads.body.downloads : null;
  // npm search carries the latest publish date but leaves out deprecated
  // packages; fall back to the compact packument (capped in size).
  const hit = (search.body?.objects ?? []).find((o: { package?: { name?: string } }) => o.package?.name === name);
  if (hit?.package?.date) facts.lastReleaseAt = hit.package.date;
  else if (!facts.deprecationNotice) {
    const doc = await getJson(`https://registry.npmjs.org/${path}`, 3_000_000);
    facts.lastReleaseAt = doc.body?.time?.[facts.latestVersion ?? ''] ?? doc.body?.modified ?? null;
  }
  return facts;
}

async function pypiFacts(name: string): Promise<Facts | null> {
  const doc = await getJson(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`, 6_000_000);
  if (doc.status === 404) return null;
  const facts = empty('pypi', name);
  facts.registryUrl = `https://pypi.org/project/${name}/`;
  const info = doc.body?.info;
  if (info) {
    facts.latestVersion = info.version ?? null;
    facts.lastReleaseAt = doc.body.urls?.[0]?.upload_time_iso_8601 ?? null;
    if ((info.classifiers ?? []).some((c: string) => /Development Status :: 7 - Inactive/.test(c))) {
      facts.deprecationNotice = 'Marked "Development Status :: 7 - Inactive" on PyPI';
    }
    const urls = [...Object.values(info.project_urls ?? {}), info.home_page];
    facts.repository = urls.map(githubRepoFrom).find(Boolean) ?? null;
  }
  const stats = await getJson(`https://pypistats.org/api/packages/${encodeURIComponent(name.toLowerCase())}/recent`);
  facts.weeklyDownloads = typeof stats.body?.data?.last_week === 'number' ? stats.body.data.last_week : null;
  return facts;
}

/** Verdict from facts alone (pure, so it can be tested without the network). */
export function judgePackage(f: Facts | null, ecosystem: Ecosystem, name: string, now = Date.now()): Pick<PackageCheck, 'verdict' | 'reason'> {
  if (ecosystem === 'pypi' && PYTHON_STDLIB.has(name.toLowerCase())) return { verdict: 'ok', reason: 'Built into Python (standard library) — no install needed' };
  if (!f && ecosystem === 'npm' && GITHUB_ONLY[name.toLowerCase()]) {
    return { verdict: 'missing', reason: `Not on npm: ${GITHUB_ONLY[name.toLowerCase()]} is a real project that installs from GitHub (see its README)` };
  }
  if (!f) return { verdict: 'missing', reason: `No package named "${name}" on ${ecosystem === 'npm' ? 'npm' : 'PyPI'}. Check the name before installing: made-up names can be registered by attackers.` };
  if (f.deprecationNotice) return { verdict: 'deprecated', reason: f.deprecationNotice };
  if (f.repositoryArchived) return { verdict: 'archived', reason: `The GitHub repository ${f.repository} is archived` };
  const releaseAge = f.lastReleaseAt ? now - Date.parse(f.lastReleaseAt) : null;
  const commitAge = f.lastCommitAt ? now - Date.parse(f.lastCommitAt) : null;
  if (releaseAge === null) return { verdict: 'unknown', reason: 'Could not find a release date' };
  if (releaseAge > 2 * YEAR && (commitAge === null || commitAge > YEAR)) {
    return { verdict: 'stale', reason: `No release for ${(releaseAge / YEAR).toFixed(1)} years${commitAge !== null ? ` and no commit for ${(commitAge / YEAR).toFixed(1)}` : ''}` };
  }
  if (releaseAge > 3 * YEAR) return { verdict: 'dormant', reason: `No release for ${(releaseAge / YEAR).toFixed(1)} years, though the repository is still active — it may have been renamed or replaced, or simply be finished` };
  return { verdict: 'ok', reason: 'Exists and is maintained' };
}

// "DEPRECATED: use x" or "This project is no longer maintained" count; a
// description that merely mentions another deprecated project does not.
export function describesItselfAsDeprecated(description: string): boolean {
  return (
    /^\W*(deprecated|unmaintained|no longer (maintained|supported))\b/i.test(description) ||
    /\b(this|the) (project|package|library|module|repo(sitory)?) (is|has been) (now )?(deprecated|unmaintained|archived|no longer (maintained|supported))\b/i.test(description)
  );
}

async function checkOne(ecosystem: Ecosystem, name: string, githubToken: string): Promise<PackageCheck> {
  const key = `pkg:v2:${ecosystem}:${name.toLowerCase()}`;
  const cached = await cacheGet<PackageCheck>(key);
  if (cached) return cached;

  const facts = ecosystem === 'npm' ? await npmFacts(name) : await pypiFacts(name);
  if (facts?.repository) {
    const repo = await repoStatus(facts.repository, githubToken);
    if (repo) {
      facts.repository = repo.fullName; // follows renames and transfers
      facts.repositoryArchived = repo.archived;
      facts.lastCommitAt = repo.pushedAt;
      if (!facts.deprecationNotice && describesItselfAsDeprecated(repo.description)) {
        facts.deprecationNotice = `GitHub description: ${quote(repo.description, 200)}`;
      }
    }
  }
  const result: PackageCheck = { ...(facts ?? empty(ecosystem, name)), ...judgePackage(facts, ecosystem, name) };
  // A registry outage shouldn't be remembered for hours.
  await cacheSet(key, result, result.verdict === 'unknown' ? 300 : 6 * 3600);
  return result;
}

export async function checkPackages(ecosystem: Ecosystem, names: string[], githubToken: string) {
  const results: (PackageCheck | { name: string; error: string })[] = [];
  const valid: { index: number; name: string }[] = [];
  names.forEach((raw, index) => {
    const name = normalizePackageName(ecosystem, raw);
    if (name) valid.push({ index, name });
    results[index] = { name: String(raw).slice(0, 100), error: `Not a valid ${ecosystem === 'npm' ? 'npm' : 'PyPI'} package name` };
  });
  // Five at a time keeps registries and GitHub comfortable.
  for (let i = 0; i < valid.length; i += 5) {
    const batch = valid.slice(i, i + 5);
    const checked = await Promise.all(batch.map((v) => checkOne(ecosystem, v.name, githubToken)));
    batch.forEach((v, j) => (results[v.index] = checked[j]));
  }
  const problems = results.filter((r): r is PackageCheck => 'verdict' in r && r.verdict !== 'ok' && r.verdict !== 'unknown');
  return {
    ecosystem,
    checkedAt: new Date().toISOString(),
    summary: problems.length
      ? `${problems.length} of ${names.length} need attention: ${problems.map((p) => `${p.name} (${p.verdict})`).join(', ')}`
      : `All ${names.length} look fine to install`,
    results,
  };
}
