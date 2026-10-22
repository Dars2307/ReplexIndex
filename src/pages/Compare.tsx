import { Columns3, Plus, X } from 'lucide-react';
import { useEffect, type FormEvent, type ReactNode } from 'react';
import type { CompatibilityEvidence, Repository } from '../types/index.ts';
import { LanguageDot, ReadinessRing, repoPath } from '../components/repo.tsx';
import { Avatar, Badge, Button, EmptyState, ErrorState, Input, PageHeader, Skeleton } from '../components/ui.tsx';
import { post } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';
import { MAX_COMPARE, useCompare } from '../lib/compare.tsx';
import { formatCount, timeAgo } from '../lib/format.ts';
import { useQuery } from '../lib/query.ts';
import { Link, useSearchParams } from '../lib/router.tsx';
import { useToast } from '../lib/toast.tsx';

interface CompareResponse {
  targetStack: string | null;
  repositories: { repository: Repository; compatibility: CompatibilityEvidence | null }[];
}

const COMPAT_LABEL: Record<CompatibilityEvidence['status'], [string, 'success' | 'warning' | 'danger' | 'neutral']> = {
  confirmed_match: ['Confirmed', 'success'],
  potential_match: ['Likely', 'warning'],
  conflict: ['Conflict', 'danger'],
  unknown: ['Unknown', 'neutral'],
};

export function ComparePage() {
  const { items, add: addToCompare, remove } = useCompare();
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const toast = useToast();

  // A shared /compare?repos=a/b,c/d link seeds the tray.
  useEffect(() => {
    const fromUrl = (params.get('repos') || '').split(',').map(decodeURIComponent).filter(Boolean);
    for (const r of fromUrl) if (/^[\w.-]+\/[\w.-]+$/.test(r)) addToCompare(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    setParams({ repos: items.length ? items.join(',') : undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.join(',')]);

  const stack = profile?.target_stack || 'Next.js + TypeScript + Tailwind';
  const key = items.length >= 2 ? `compare:${items.join(',').toLowerCase()}:${stack}` : null;
  const { data, error, loading, refetch } = useQuery<CompareResponse>(key, () => post('/api/v1/compare', { fullNames: items, targetStack: stack }), 10 * 60_000);

  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem('repo') as HTMLInputElement;
    const value = input.value.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '');
    if (!/^[\w.-]+\/[\w.-]+$/.test(value)) {
      toast({ tone: 'error', title: 'Use the owner/repo format', description: 'For example vercel/next.js' });
      return;
    }
    const result = addToCompare(value);
    if (result === 'full') toast({ tone: 'error', title: `You can compare up to ${MAX_COMPARE} repositories` });
    if (result === 'exists') toast({ tone: 'info', title: `${value} is already in the comparison` });
    input.value = '';
  };

  const rows: { label: string; render: (r: Repository, c: CompatibilityEvidence | null) => ReactNode }[] = [
    { label: 'Category', render: (r) => r.purpose.technicalCategory.replace(' / Unclassified', '') },
    { label: 'Agent readiness', render: (r) => <ReadinessRing score={r.agentReadiness.score} size={32} /> },
    {
      label: `Fits ${data?.targetStack ?? stack}`,
      render: (_r, c) => (c ? <Badge tone={COMPAT_LABEL[c.status][1]}>{COMPAT_LABEL[c.status][0]}</Badge> : '—'),
    },
    { label: 'Stars', render: (r) => <span className="tabular">{formatCount(r.stars)}</span> },
    { label: 'Forks', render: (r) => <span className="tabular">{formatCount(r.forks)}</span> },
    { label: 'Open issues', render: (r) => <span className="tabular">{formatCount(r.openIssues)}</span> },
    { label: 'Language', render: (r) => <LanguageDot language={r.primaryLanguage} /> },
    { label: 'License', render: (r) => (r.license?.spdxId && r.license.spdxId !== 'NOASSERTION' ? r.license.spdxId : <span className="text-warning">None</span>) },
    { label: 'Latest release', render: (r) => r.latestRelease?.tag ?? '—' },
    { label: 'Last push', render: (r) => timeAgo(r.pushedAt) },
    { label: 'Maturity', render: (r) => <span className="capitalize">{r.purpose.maturitySignals.status.replace('_', ' ')}</span> },
    { label: 'Approach', render: (r) => r.purpose.implementationApproach },
    { label: 'Frameworks', render: (r) => r.stackEvidence.frameworks.join(', ') || '—' },
  ];

  return (
    <>
      <PageHeader title="Compare" description={`Put up to ${MAX_COMPARE} repositories side by side, scored against your stack.`} />

      <form onSubmit={add} className="mb-6 flex max-w-xl gap-2">
        <label htmlFor="compare-add" className="sr-only">
          Add a repository to compare
        </label>
        <Input id="compare-add" name="repo" placeholder="owner/repo or a GitHub URL" autoComplete="off" spellCheck={false} disabled={items.length >= MAX_COMPARE} />
        <Button type="submit" icon={<Plus className="size-4" aria-hidden />} disabled={items.length >= MAX_COMPARE}>
          Add
        </Button>
      </form>

      {items.length < 2 ? (
        <EmptyState
          icon={<Columns3 className="size-5" aria-hidden />}
          title={items.length === 1 ? 'Add one more repository' : 'Nothing to compare yet'}
          description="Use the compare button on any repository card, or add one above by name."
          action={
            <Link to="/discover" className="inline-flex h-8 items-center rounded-sm bg-primary px-3 text-sm font-medium text-primary-fg hover:opacity-90">
              Browse Discover
            </Link>
          }
        />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : loading || !data ? (
        <Skeleton className="h-[520px]" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm scrollbar-thin">
          <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
            <caption className="sr-only">Repository comparison</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="w-40 p-4 align-bottom text-[12px] font-medium text-fg-subtle">
                  Repository
                </th>
                {data.repositories.map(({ repository: r }) => (
                  <th key={r.fullName} scope="col" className="min-w-52 p-4 align-top font-normal">
                    <div className="flex items-start gap-2.5">
                      <Avatar src={`${r.owner.avatarUrl}${r.owner.avatarUrl.includes('?') ? '&' : '?'}s=56`} alt="" size={28} square />
                      <div className="min-w-0 flex-1">
                        <Link to={repoPath(r.fullName)} className="block truncate font-semibold text-fg hover:underline" translate="no">
                          {r.fullName}
                        </Link>
                        <p className="mt-0.5 line-clamp-2 text-[12px] text-fg-muted">{r.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(r.fullName)}
                        aria-label={`Remove ${r.fullName} from comparison`}
                        className="-mr-1 grid size-7 shrink-0 place-items-center rounded-sm text-fg-subtle hover:bg-muted hover:text-fg pointer-coarse:size-11"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <th scope="row" className="p-4 text-[12px] font-medium text-fg-subtle">
                    {row.label}
                  </th>
                  {data.repositories.map(({ repository, compatibility }) => (
                    <td key={repository.fullName} className="p-4 text-fg">
                      {row.render(repository, compatibility)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
