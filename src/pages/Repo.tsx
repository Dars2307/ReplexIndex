import { ArrowLeft, CircleCheck, CircleDashed, CircleX, ExternalLink, GitFork, Globe, Scale, Star, Tag, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CompatibilityEvidence, Repository } from '../types/index.ts';
import { CompareToggle, LanguageDot, ReadinessRing, readinessTone, SaveButton } from '../components/repo.tsx';
import { Avatar, Badge, Card, CodeBlock, cn, ErrorState, Input, Skeleton } from '../components/ui.tsx';
import { api } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';
import { formatCount, formatDate, timeAgo } from '../lib/format.ts';
import { useQuery } from '../lib/query.ts';
import { Link, useSearchParams } from '../lib/router.tsx';

interface RepoResponse {
  repository: Repository;
  compatibility: CompatibilityEvidence | null;
}

const COMPAT: Record<CompatibilityEvidence['status'], { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; icon: typeof CircleCheck }> = {
  confirmed_match: { label: 'Confirmed match', tone: 'success', icon: CircleCheck },
  potential_match: { label: 'Likely compatible', tone: 'warning', icon: CircleDashed },
  conflict: { label: 'Conflict', tone: 'danger', icon: CircleX },
  unknown: { label: 'Not enough evidence', tone: 'neutral', icon: CircleDashed },
};

const CHECK_MAX = {
  licenseClarity: 20,
  documentationAvailability: 25,
  packageOrIntegrationInstructions: 20,
  typeDefinitions: 15,
  maintenanceSignals: 10,
  configurationComplexity: 10,
} as const;

// Markdown-lite: renders README structure as React text nodes (never as HTML),
// dropping raw HTML, badge images and link syntax.
function ReadmePreview({ markdown }: { markdown: string }) {
  const lines = markdown
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[\s*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .split('\n')
    .map((l) => l.replace(/^\s*>\s?/, '').replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i, (_m, kind: string) => `${kind[0]}${kind.slice(1).toLowerCase()}:`));

  const blocks: ReactNode[] = [];
  let code: string[] | null = null;
  let para: string[] = [];
  const flush = () => {
    const text = para.join(' ').replace(/\*\*|__|`/g, '').trim();
    if (text) blocks.push(<p key={blocks.length} className="text-fg-muted">{text}</p>);
    para = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim().startsWith('```')) {
      if (code) {
        blocks.push(
          <pre key={blocks.length} className="overflow-x-auto rounded-md bg-bg p-3 font-mono text-[12px] leading-5 text-fg scrollbar-thin" translate="no">
            {code.join('\n')}
          </pre>,
        );
        code = null;
      } else {
        flush();
        code = [];
      }
      continue;
    }
    if (code) {
      code.push(raw);
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line.trim());
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line) || /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      const text = heading[2].replace(/\*\*|`/g, '').trim();
      if (text) blocks.push(<h3 key={blocks.length} className={cn('font-semibold text-fg', heading[1].length <= 2 ? 'text-[15px]' : 'text-sm')}>{text}</h3>);
    } else if (bullet) {
      flush();
      const text = bullet[1].replace(/\*\*|__|`/g, '').trim();
      if (text) blocks.push(<p key={blocks.length} className="flex gap-2 text-fg-muted"><span aria-hidden className="text-fg-subtle">•</span>{text}</p>);
    } else if (!line.trim()) {
      flush();
    } else if (!/^[|:\-\s]+$/.test(line)) {
      para.push(line.trim());
    }
  }
  flush();
  return <div className="space-y-3 text-[13.5px] leading-6">{blocks.slice(0, 60)}</div>;
}

function Stat({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-4 py-3">
      <span className="text-fg-subtle [&>svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <div className="text-[12px] text-fg-subtle">{label}</div>
        <div className="truncate font-medium tabular text-fg">{children}</div>
      </div>
    </div>
  );
}

export function RepoPage({ owner, name }: { owner: string; name: string }) {
  const fullName = `${owner}/${name}`;
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const stack = params.get('stack') || profile?.target_stack || 'Next.js + TypeScript + Tailwind';
  const key = `repo:${fullName.toLowerCase()}:${stack}`;
  const { data, error, loading, refetch } = useQuery<RepoResponse>(
    key,
    () => api(`/api/v1/repos/${fullName}?stack=${encodeURIComponent(stack)}`),
    10 * 60_000,
  );

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink />
        <h1 id="page-title" tabIndex={-1} className="text-2xl font-semibold outline-none" translate="no">
          {fullName}
        </h1>
        <ErrorState message={error.message} onRetry={refetch} />
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div aria-busy="true" aria-label="Loading repository">
        <BackLink />
        <div className="mt-6 flex gap-4">
          <Skeleton className="size-14" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <Skeleton className="mt-8 h-20" />
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const repo = data.repository;
  const compat = data.compatibility;
  const readiness = repo.agentReadiness;
  const checklist = (Object.entries(readiness.checklist) as [keyof typeof CHECK_MAX, (typeof readiness.checklist)[keyof typeof CHECK_MAX]][]).map(
    ([k, item]) => ({ ...item, max: CHECK_MAX[k] }),
  );
  const compatMeta = compat ? COMPAT[compat.status] : null;

  return (
    <article>
      <BackLink />

      <header className="mt-5 flex flex-col gap-5 md:flex-row md:items-start">
        <Avatar src={`${repo.owner.avatarUrl}${repo.owner.avatarUrl.includes('?') ? '&' : '?'}s=112`} alt={`${repo.owner.login} avatar`} size={56} square />
        <div className="min-w-0 flex-1">
          <h1 id="page-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none" translate="no">
            <span className="font-normal text-fg-muted">{repo.owner.login}/</span>
            {repo.name}
          </h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-6 text-fg-muted">{repo.description || 'No description provided.'}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone="accent">{repo.purpose.technicalCategory.replace(' / Unclassified', '')}</Badge>
            {repo.purpose.subcategories
              .filter((s) => s !== 'General')
              .map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            {repo.isArchived && <Badge tone="warning">Archived</Badge>}
            {repo.purpose.maturitySignals.status === 'experimental' && <Badge tone="warning">New · under 90 days</Badge>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <CompareToggle fullName={repo.fullName} size="md" />
          <SaveButton repo={repo} size="md" withLabel />
          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-2 rounded-sm bg-primary px-3 text-sm font-medium text-primary-fg hover:opacity-90 pointer-coarse:min-h-11"
          >
            View on GitHub <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </header>

      <Card className="mt-6 grid grid-cols-2 divide-border sm:grid-cols-3 lg:grid-cols-6 [&>*]:border-border max-lg:[&>*:nth-child(n+3)]:border-t lg:divide-x">
        <Stat icon={<Star />} label="Stars">
          {formatCount(repo.stars)}
        </Stat>
        <Stat icon={<GitFork />} label="Forks">
          {formatCount(repo.forks)}
        </Stat>
        <Stat icon={<TriangleAlert />} label="Open issues">
          {formatCount(repo.openIssues)}
        </Stat>
        <Stat icon={<Scale />} label="License">
          {repo.license?.spdxId && repo.license.spdxId !== 'NOASSERTION' ? repo.license.spdxId : 'None found'}
        </Stat>
        <Stat icon={<Tag />} label="Latest release">
          {repo.latestRelease ? (
            <a href={repo.latestRelease.url} target="_blank" rel="noreferrer" className="hover:underline" title={formatDate(repo.latestRelease.publishedAt)}>
              {repo.latestRelease.tag}
            </a>
          ) : (
            'No releases'
          )}
        </Stat>
        <Stat icon={<CircleDashed />} label="Last push">
          {timeAgo(repo.pushedAt)}
        </Stat>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-start gap-4">
              <ReadinessRing score={readiness.score} size={56} />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold">Agent readiness</h2>
                <p className="mt-1 text-fg-muted">{readiness.summary}</p>
              </div>
              <Badge className="hidden sm:inline-flex">
                {readiness.confidence[0].toUpperCase() + readiness.confidence.slice(1)} confidence
              </Badge>
            </div>
            <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {checklist.map((item) => (
                <li key={item.label}>
                  <div className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="flex items-center gap-1.5 text-fg">
                      {item.verified ? <CircleCheck className="size-3.5 text-success" aria-label="Verified" /> : <CircleDashed className="size-3.5 text-fg-subtle" aria-label="Not verified" />}
                      {item.label}
                    </span>
                    <span className="shrink-0 font-mono text-[12px] tabular text-fg-subtle">
                      {item.score}/{item.max}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-muted" aria-hidden>
                    <div
                      className={cn('h-1 rounded-full', item.score >= item.max ? 'bg-success' : 'bg-fg-subtle')}
                      style={{ width: `${Math.min(100, (item.score / item.max) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold">What it is</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[12px] text-fg-subtle">Purpose</dt>
                <dd className="mt-0.5 text-fg">{repo.purpose.functionalPurpose}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-fg-subtle">Built for</dt>
                <dd className="mt-0.5 text-fg">{repo.purpose.intendedAudience}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-fg-subtle">Approach</dt>
                <dd className="mt-0.5 text-fg">{repo.purpose.implementationApproach}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-fg-subtle">Runs on</dt>
                <dd className="mt-0.5 text-fg">{repo.purpose.supportedEnvironments.join(', ')}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-fg-subtle">Activity</dt>
                <dd className="mt-0.5 text-fg">{repo.purpose.maturitySignals.releaseCadence}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-fg-subtle">Created</dt>
                <dd className="mt-0.5 text-fg">{formatDate(repo.createdAt)}</dd>
              </div>
            </dl>
          </Card>

          {repo.readmeExtract && (
            <Card>
              <h2 className="border-b border-border px-5 py-3 text-base font-semibold">README preview</h2>
              <div className="max-h-[28rem] overflow-y-auto px-5 py-4 scrollbar-thin">
                <ReadmePreview markdown={repo.readmeExtract} />
              </div>
              <div className="border-t border-border px-5 py-2.5">
                <a href={repo.readmeUrl || repo.htmlUrl} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-link hover:underline">
                  Read the full README on GitHub
                </a>
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-6" aria-label="Integration">
          <Card className="p-5">
            <h2 className="text-base font-semibold">Fits your stack?</h2>
            <label htmlFor="stack" className="mt-3 block text-[12px] text-fg-subtle">
              Target stack
            </label>
            <Input
              id="stack"
              key={stack}
              defaultValue={stack}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setParams({ stack: e.currentTarget.value.trim() || undefined });
              }}
              onBlur={(e) => e.currentTarget.value.trim() !== stack && setParams({ stack: e.currentTarget.value.trim() || undefined })}
              className="mt-1"
              autoComplete="off"
            />
            {compat && compatMeta && (
              <>
                <div className="mt-4 flex items-center gap-2">
                  <compatMeta.icon
                    className={cn('size-4', compatMeta.tone === 'success' ? 'text-success' : compatMeta.tone === 'warning' ? 'text-warning' : compatMeta.tone === 'danger' ? 'text-danger' : 'text-fg-subtle')}
                    aria-hidden
                  />
                  <span className="font-medium text-fg">{compatMeta.label}</span>
                </div>
                <p className="mt-1.5 text-[13px] text-fg-muted">{compat.summary}</p>
                {compat.supportingEvidence.length > 0 && (
                  <ul className="mt-3 space-y-1 text-[13px] text-fg-muted">
                    {compat.supportingEvidence.slice(0, 4).map((e) => (
                      <li key={e} className="flex gap-2">
                        <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden /> {e}
                      </li>
                    ))}
                  </ul>
                )}
                {compat.missingEvidence.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[13px] text-fg-muted">
                    {compat.missingEvidence.slice(0, 3).map((e) => (
                      <li key={e} className="flex gap-2">
                        <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-fg-subtle" aria-hidden /> {e}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Card>

          {repo.installCommand && (
            <Card className="p-5">
              <h2 className="mb-3 text-base font-semibold">Install</h2>
              <CodeBlock code={repo.installCommand} />
              <p className="mt-2 text-[12px] text-fg-subtle">Inferred from the primary language — check the README for the exact package name.</p>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="mb-3 text-base font-semibold">Details</h2>
            <dl className="space-y-3 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-fg-subtle">Language</dt>
                <dd>
                  <LanguageDot language={repo.primaryLanguage} />
                </dd>
              </div>
              {repo.stackEvidence.frameworks.length > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-subtle">Frameworks</dt>
                  <dd className="text-right text-fg">{repo.stackEvidence.frameworks.join(', ')}</dd>
                </div>
              )}
              {repo.homepageUrl && /^https?:\/\//i.test(repo.homepageUrl) && (
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-subtle">Website</dt>
                  <dd className="min-w-0">
                    <a href={repo.homepageUrl} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-link hover:underline">
                      <Globe className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{repo.homepageUrl.replace(/^https?:\/\//, '')}</span>
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {repo.topics.length > 0 && (
              <>
                <h3 className="mb-2 mt-5 text-[12px] text-fg-subtle">Topics</h3>
                <ul className="flex flex-wrap gap-1.5">
                  {repo.topics.map((t) => (
                    <li key={t}>
                      <Link to={`/search?topic=${encodeURIComponent(t)}&sort=stars`} className="inline-flex h-6 items-center rounded-xs bg-muted px-2 text-[12px] text-fg-muted hover:text-fg">
                        {t}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </aside>
      </div>
    </article>
  );
}

function BackLink() {
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = '/discover'))}
      className="inline-flex h-7 items-center gap-1.5 rounded-sm px-1.5 -ml-1.5 text-[13px] text-fg-muted hover:bg-muted hover:text-fg"
    >
      <ArrowLeft className="size-3.5" aria-hidden /> Back
    </button>
  );
}
