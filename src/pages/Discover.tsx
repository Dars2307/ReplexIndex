import { Flame, Rocket } from 'lucide-react';
import type { Repository, TrendingWindow } from '../types/index.ts';
import { RepoCard, RepoGridSkeleton } from '../components/repo.tsx';
import { cn, EmptyState, ErrorState, PageHeader, Segmented } from '../components/ui.tsx';
import { api } from '../lib/api.ts';
import { useQuery } from '../lib/query.ts';
import { useSearchParams } from '../lib/router.tsx';

export const TOPICS: { value: string; label: string }[] = [
  { value: '', label: 'Everything' },
  { value: 'ai-agents', label: 'AI agents' },
  { value: 'llm', label: 'LLMs' },
  { value: 'mcp', label: 'MCP' },
  { value: 'reverse-engineering', label: 'Reverse engineering' },
  { value: 'security', label: 'Security' },
  { value: 'developer-tools', label: 'Dev tools' },
  { value: 'design-system', label: 'Design systems' },
  { value: 'self-hosted', label: 'Self-hosted' },
  { value: 'gamedev', label: 'Game dev' },
];

const LANGUAGES = ['', 'TypeScript', 'Python', 'Rust', 'Go', 'C++', 'Java', 'Swift', 'Kotlin', 'C#', 'Zig'];

interface TrendingResponse {
  window: TrendingWindow;
  rising: Repository[];
  breakout: Repository[];
}

export function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const window = (['day', 'week', 'month'].includes(params.get('window') || '') ? params.get('window') : 'week') as TrendingWindow;
  const topic = params.get('topic') || '';
  const language = params.get('language') || '';

  const qs = new URLSearchParams({ window, ...(topic && { topic }), ...(language && { language }) }).toString();
  const { data, error, loading, refetch } = useQuery<TrendingResponse>(`trending:${qs}`, () => api(`/api/v1/discover/trending?${qs}`), 10 * 60_000);

  const windowLabel = window === 'day' ? 'the last 48 hours' : window === 'week' ? 'the last 7 days' : 'the last 30 days';

  return (
    <>
      <PageHeader
        title="Discover"
        description="What’s moving on GitHub right now — new projects ranked by stars, refreshed every few minutes."
        actions={
          <Segmented
            label="Time window"
            value={window}
            onChange={(v) => setParams({ window: v === 'week' ? undefined : v })}
            options={[
              { value: 'day', label: 'Today' },
              { value: 'week', label: 'This week' },
              { value: 'month', label: 'This month' },
            ]}
          />
        }
      />

      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="group" aria-label="Topic" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
          {TOPICS.map((t) => (
            <button
              key={t.value || 'all'}
              type="button"
              aria-pressed={topic === t.value}
              onClick={() => setParams({ topic: t.value || undefined })}
              className={cn(
                'h-7 shrink-0 rounded-full border px-3 text-[13px] font-medium transition-colors pointer-coarse:h-10',
                topic === t.value ? 'border-transparent bg-primary text-primary-fg' : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[13px] text-fg-muted lg:ml-auto">
          Language
          <select
            value={language}
            onChange={(e) => setParams({ language: e.target.value || undefined })}
            className="h-8 rounded-sm border border-input bg-surface px-2 text-[13px] text-fg pointer-coarse:h-11"
          >
            {LANGUAGES.map((l) => (
              <option key={l || 'any'} value={l}>
                {l || 'Any'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <ErrorState message={error.message} onRetry={refetch} />}

      <section aria-labelledby="rising-heading" className="mb-12">
        <div className="mb-4 flex items-baseline gap-3">
          <h2 id="rising-heading" className="flex items-center gap-2 text-lg font-semibold">
            <Rocket className="size-4 text-accent" aria-hidden /> Rising
          </h2>
          <p className="text-[13px] text-fg-subtle">Created in {windowLabel}, ranked by stars</p>
        </div>
        {loading && !data ? (
          <RepoGridSkeleton count={9} />
        ) : data && data.rising.length === 0 ? (
          <EmptyState
            icon={<Rocket className="size-5" aria-hidden />}
            title="Nothing rising here yet"
            description="Try a wider time window or a different topic."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data?.rising.slice(0, 12).map((r, i) => <RepoCard key={r.fullName} repo={r} rank={i + 1} />)}
          </div>
        )}
      </section>

      <section aria-labelledby="breakout-heading">
        <div className="mb-4 flex items-baseline gap-3">
          <h2 id="breakout-heading" className="flex items-center gap-2 text-lg font-semibold">
            <Flame className="size-4 text-warning" aria-hidden /> Breakout
          </h2>
          <p className="text-[13px] text-fg-subtle">Under 90 days old and already past 1,000 stars</p>
        </div>
        {loading && !data ? (
          <RepoGridSkeleton count={6} />
        ) : data && data.breakout.length === 0 ? (
          <EmptyState icon={<Flame className="size-5" aria-hidden />} title="No breakouts for this filter" description="Breakouts are rarer — try “Everything”." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data?.breakout.slice(0, 12).map((r, i) => <RepoCard key={r.fullName} repo={r} rank={i + 1} />)}
          </div>
        )}
      </section>
    </>
  );
}
