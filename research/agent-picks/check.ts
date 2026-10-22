// Reality check for one recommended package: registry + downloads + GitHub.
import type { Ecosystem } from './tasks.ts';

export type Verdict = 'missing' | 'deprecated' | 'archived' | 'stale' | 'ok' | 'unknown';

export interface PackageFacts {
  ecosystem: Ecosystem;
  name: string;
  exists: boolean;
  latestVersion: string | null;
  lastReleaseAt: string | null;
  deprecatedMessage: string | null;
  weeklyDownloads: number | null;
  repo: string | null;
  repoArchived: boolean | null;
  repoPushedAt: string | null;
  repoStars: number | null;
  verdict: Verdict;
  reason: string;
}

const YEAR = 365 * 24 * 3600 * 1000;
const githubToken = process.env.GITHUB_TOKEN || '';
const cache = new Map<string, Promise<PackageFacts>>();

async function getJson(url: string, headers: Record<string, string> = {}): Promise<{ status: number; body: any }> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'replex-research', ...headers }, signal: AbortSignal.timeout(20_000) });
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    return { status: res.status, body: res.ok ? await res.json().catch(() => null) : null };
  }
}

function githubRepoFrom(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  // npm shorthand: "owner/repo" or "github:owner/repo"
  const short = url.match(/^(?:github:)?([\w.-]+)\/([\w.-]+)$/i);
  if (short) return `${short[1]}/${short[2]}`;
  const m = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/#?].*)?$/i);
  return m ? `${m[1]}/${m[2]}` : null;
}

async function npmFacts(name: string): Promise<Omit<PackageFacts, 'repoArchived' | 'repoPushedAt' | 'repoStars' | 'verdict' | 'reason'>> {
  const reg = await getJson(`https://registry.npmjs.org/${name.replace('/', '%2F')}`);
  if (reg.status === 404 || !reg.body?.['dist-tags']) {
    return { ecosystem: 'npm', name, exists: false, latestVersion: null, lastReleaseAt: null, deprecatedMessage: null, weeklyDownloads: null, repo: null };
  }
  const latest: string = reg.body['dist-tags'].latest;
  const dl = await getJson(`https://api.npmjs.org/downloads/point/last-week/${name}`);
  const repoField = reg.body.versions?.[latest]?.repository ?? reg.body.repository;
  return {
    ecosystem: 'npm',
    name,
    exists: true,
    latestVersion: latest,
    lastReleaseAt: reg.body.time?.[latest] ?? null,
    deprecatedMessage: reg.body.versions?.[latest]?.deprecated || null,
    weeklyDownloads: typeof dl.body?.downloads === 'number' ? dl.body.downloads : null,
    repo: githubRepoFrom(typeof repoField === 'string' ? repoField : repoField?.url),
  };
}

async function pypiFacts(name: string): Promise<Omit<PackageFacts, 'repoArchived' | 'repoPushedAt' | 'repoStars' | 'verdict' | 'reason'>> {
  const reg = await getJson(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
  if (reg.status === 404 || !reg.body?.info) {
    return { ecosystem: 'pypi', name, exists: false, latestVersion: null, lastReleaseAt: null, deprecatedMessage: null, weeklyDownloads: null, repo: null };
  }
  const info = reg.body.info;
  const files: { upload_time_iso_8601?: string }[] = reg.body.urls ?? [];
  const inactive = (info.classifiers ?? []).some((c: string) => /Development Status :: 7 - Inactive/.test(c));
  const urls = Object.values(info.project_urls ?? {}).concat(info.home_page ?? []);
  const stats = await getJson(`https://pypistats.org/api/packages/${encodeURIComponent(name.toLowerCase())}/recent`);
  return {
    ecosystem: 'pypi',
    name,
    exists: true,
    latestVersion: info.version ?? null,
    lastReleaseAt: files[0]?.upload_time_iso_8601 ?? null,
    deprecatedMessage: inactive ? 'Marked "Development Status :: 7 - Inactive" on PyPI' : null,
    weeklyDownloads: typeof stats.body?.data?.last_week === 'number' ? stats.body.data.last_week : null,
    repo: urls.map(githubRepoFrom).find(Boolean) ?? null,
  };
}

function judge(f: Omit<PackageFacts, 'verdict' | 'reason'>): Pick<PackageFacts, 'verdict' | 'reason'> {
  if (!f.exists) return { verdict: 'missing', reason: `No package named "${f.name}" on ${f.ecosystem === 'npm' ? 'npm' : 'PyPI'}` };
  if (f.deprecatedMessage) return { verdict: 'deprecated', reason: f.deprecatedMessage.slice(0, 200) };
  if (f.repoArchived) return { verdict: 'archived', reason: `GitHub repository ${f.repo} is archived` };
  const releaseAge = f.lastReleaseAt ? Date.now() - Date.parse(f.lastReleaseAt) : null;
  const pushAge = f.repoPushedAt ? Date.now() - Date.parse(f.repoPushedAt) : null;
  if (releaseAge !== null && releaseAge > 2 * YEAR && (pushAge === null || pushAge > YEAR)) {
    const years = (releaseAge / YEAR).toFixed(1);
    return { verdict: 'stale', reason: `Last release ${years} years ago${pushAge !== null ? `, last commit ${(pushAge / YEAR).toFixed(1)} years ago` : ''}` };
  }
  if (releaseAge === null) return { verdict: 'unknown', reason: 'No release date found' };
  return { verdict: 'ok', reason: 'Maintained' };
}

export function checkPackage(ecosystem: Ecosystem, rawName: string): Promise<PackageFacts> {
  const name = rawName.trim().replace(/^npm:|^pip:/i, '').replace(/\s.*$/, '').replace(/@[\d^~<>=.x*]+$/, '');
  const key = `${ecosystem}:${name.toLowerCase()}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        const base = ecosystem === 'npm' ? await npmFacts(name) : await pypiFacts(name);
        let repoArchived: boolean | null = null;
        let repoPushedAt: string | null = null;
        let repoStars: number | null = null;
        let repo = base.repo;
        if (repo) {
          const gh = await getJson(`https://api.github.com/repos/${repo}`, githubToken ? { Authorization: `Bearer ${githubToken}` } : {});
          if (gh.body) {
            repo = gh.body.full_name ?? repo; // follows renames/transfers
            repoArchived = Boolean(gh.body.archived);
            repoPushedAt = gh.body.pushed_at ?? null;
            repoStars = gh.body.stargazers_count ?? null;
            if (!base.deprecatedMessage && /\b(deprecated|no longer maintained|unmaintained)\b/i.test(gh.body.description ?? '')) {
              base.deprecatedMessage = `GitHub description: "${String(gh.body.description).slice(0, 160)}"`;
            }
          }
        }
        const facts = { ...base, repo, repoArchived, repoPushedAt, repoStars };
        return { ...facts, ...judge(facts) };
      })(),
    );
  }
  return cache.get(key)!;
}
