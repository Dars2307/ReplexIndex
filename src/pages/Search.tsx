import { Search as SearchIcon, SearchX, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import type { DiscoverySearchResult, Repository } from '../types/index.ts';
import { RepoCard, RepoGridSkeleton } from '../components/repo.tsx';
import { AiSearch } from '../components/AiSearch.tsx';
import { Button, cn, EmptyState, ErrorState, Input, PageHeader, Segmented } from '../components/ui.tsx';
import { api } from '../lib/api.ts';
import { formatNumber } from '../lib/format.ts';
import { invalidate, useQuery } from '../lib/query.ts';
import { Link, useSearchParams } from '../lib/router.tsx';

const SUGGESTIONS = [
  'MCP server',
  'reverse engineering decompiler',
  'local LLM inference',
  'shadcn components',
  'self-hosted analytics',
  'browser automation agent',
  'rust game engine',
  'figma to code',
];

const SORTS = [
  { value: '', label: 'Best match' },
  { value: 'stars', label: 'Most stars' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'forks', label: 'Most forks' },
];
const CREATED = [
  { value: '', label: 'Any time' },
  { value: '7', label: 'Past week' },
  { value: '30', label: 'Past month' },
  { value: '365', label: 'Past year' },
];

/** Text filter that only commits on Enter or blur, so typing doesn't fire a GitHub search per keystroke. */
function CommitInput({
  label,
  value,
  onCommit,
  className,
  ...rest
}: { label: string; value: string; onCommit: (v: string) => void; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const commit = (v: string) => {
    if (v.trim() !== value) onCommit(v.trim());
  };
  return (
    <label className="grid gap-1 text-[12px] font-medium text-fg-subtle">
      {label}
      <Input
        key={value}
        defaultValue={value}
        onBlur={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(e.currentTarget.value);
          }
        }}
        className={className}
        autoComplete="off"
        spellCheck={false}
        {...rest}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="grid gap-1 text-[12px] font-medium text-fg-subtle">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 min-w-36 rounded-sm border border-input bg-surface px-2 text-[13px] font-normal text-fg pointer-coarse:h-11"
      >
        {options.map((o) => (
          <option key={o.value || 'any'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const mode: 'github' | 'ai' = params.get('mode') === 'ai' ? 'ai' : 'github';
  const q = params.get('q') || '';
  const language = params.get('language') || '';
  const topic = params.get('topic') || '';
  const sort = params.get('sort') || '';
  const created = params.get('created') || '';
  const minStars = params.get('minStars') || '';
  const [draft, setDraft] = useState(q);
  const [pages, setPages] = useState(1);
  const [showFilters, setShowFilters] = useState(Boolean(language || topic || sort || created || minStars));

  useEffect(() => {
    setDraft(q);
    setPages(1);
  }, [q, language, topic, sort, created, minStars]);

  const hasQuery = Boolean(q || language || topic || created || minStars);
  const base = new URLSearchParams(
    Object.entries({ q, language, topic, sort, created, minStars }).filter(([, v]) => v) as [string, string][],
  );

  const pageResults: (DiscoverySearchResult | undefined)[] = [];
  const pageErrors: (Error | undefined)[] = [];
  const pageLoading: boolean[] = [];
  for (let p = 1; p <= 10; p++) {
    const qs = new URLSearchParams(base);
    qs.set('page', String(p));
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const r = useQuery<DiscoverySearchResult>(
      hasQuery && p <= pages ? `search:${qs}` : null,
      () => {
        invalidate('searches');
        return api(`/api/v1/discover/search?${qs}`);
      },
      5 * 60_000,
    );
    pageResults.push(r.data);
    pageErrors.push(r.error);
    pageLoading.push(r.loading);
  }
  const first = pageResults[0];
  const items: Repository[] = pageResults.flatMap((r) => r?.items ?? []);
  const error = pageErrors.find(Boolean);
  const loadingMore = pageLoading.slice(1, pages).some(Boolean);
  const canLoadMore = first && items.length < first.total && pages < 10 && !loadingMore;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setParams({ q: draft.trim() || undefined });
  };

  const modeSwitch = (
    <Segmented
      label="Search mode"
      value={mode}
      onChange={(v) => setParams({ mode: v === 'ai' ? 'ai' : undefined })}
      options={[
        { value: 'github', label: 'Search GitHub' },
        { value: 'ai', label: 'Ask AI ✦' },
      ]}
    />
  );

  if (mode === 'ai') {
    return (
      <>
        <PageHeader
          title="Search"
          description="Describe what you need in plain English. The AI searches GitHub several ways, then checks each result against your request."
          actions={modeSwitch}
        />
        <AiSearch />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Search"
        description="Search every public repository on GitHub. Results are classified and scored for agent-readiness."
        actions={modeSwitch}
      />

      <form role="search" onSubmit={submit} className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <label htmlFor="search-q" className="sr-only">
            Search GitHub repositories
          </label>
          <Input
            id="search-q"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Try “reverse engineering”, “mcp server”, “vector database”…"
            className="h-10 pl-9 text-[15px] pointer-coarse:h-12"
            maxLength={200}
          />
        </div>
        <Button type="submit" variant="primary" size="lg">
          Search
        </Button>
        <Button
          size="lg"
          aria-expanded={showFilters}
          aria-controls="search-filters"
          onClick={() => setShowFilters((s) => !s)}
          icon={<SlidersHorizontal className="size-4" aria-hidden />}
          className="max-sm:w-10 max-sm:px-0"
        >
          <span className="max-sm:sr-only">Filters</span>
        </Button>
      </form>

      {showFilters && (
        <div id="search-filters" className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-3">
          <CommitInput label="Language" value={language} onCommit={(v) => setParams({ language: v || undefined })} placeholder="e.g. Rust" className="w-36" list="language-options" />
          <datalist id="language-options">
            {['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'C', 'C++', 'C#', 'Java', 'Kotlin', 'Swift', 'Zig', 'Ruby', 'PHP', 'Dart', 'Lua', 'Shell'].map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
          <CommitInput label="Topic" value={topic} onCommit={(v) => setParams({ topic: v || undefined })} placeholder="e.g. llm" className="w-40" />
          <Select label="Sort" value={sort} onChange={(v) => setParams({ sort: v || undefined })} options={SORTS} />
          <Select label="Created" value={created} onChange={(v) => setParams({ created: v || undefined })} options={CREATED} />
          <CommitInput
            label="Min stars"
            value={minStars}
            onCommit={(v) => setParams({ minStars: v || undefined })}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="0"
            className="w-28"
          />
          {(language || topic || sort || created || minStars) && (
            <Button variant="ghost" size="sm" className="mb-0.5" onClick={() => setParams({ language: undefined, topic: undefined, sort: undefined, created: undefined, minStars: undefined })}>
              Reset filters
            </Button>
          )}
        </div>
      )}

      {!hasQuery ? (
        <section aria-labelledby="suggestions" className="mt-8">
          <h2 id="suggestions" className="mb-3 text-[13px] font-medium text-fg-subtle">
            Popular searches
          </h2>
          <ul className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <Link
                  to={`/search?q=${encodeURIComponent(s)}`}
                  className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-fg-muted hover:border-border-strong hover:text-fg pointer-coarse:h-11"
                >
                  <SearchIcon className="size-3.5" aria-hidden />
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <div className={cn('mb-4 mt-2 flex flex-wrap items-baseline justify-between gap-2', !first && 'invisible')} aria-live="polite">
            <p className="text-fg-muted">
              <span className="font-medium text-fg tabular">{first ? formatNumber(first.total) : 0}</span>
              {first?.total === 1000 ? '+' : ''} repositories
              {first?.incomplete && <span className="text-fg-subtle"> · GitHub timed out, results may be partial</span>}
            </p>
            {first && (
              <code className="max-w-full truncate rounded-xs bg-muted px-1.5 py-0.5 font-mono text-[12px] text-fg-subtle" title="The exact GitHub query Replex ran">
                {first.query}
              </code>
            )}
          </div>

          {error && items.length === 0 && <ErrorState message={error.message} onRetry={() => invalidate('search:')} />}
          {!first && !error && <RepoGridSkeleton count={9} />}
          {first && items.length === 0 && (
            <EmptyState
              icon={<SearchX className="size-5" aria-hidden />}
              title="No repositories match"
              description="Try fewer words, remove a filter, or search a GitHub topic instead."
            />
          )}
          {items.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((r) => (
                <RepoCard key={r.fullName} repo={r} />
              ))}
            </div>
          )}
          {(canLoadMore || loadingMore) && (
            <div className="mt-8 flex justify-center">
              <Button onClick={() => setPages((p) => p + 1)} loading={loadingMore}>
                Load more
              </Button>
            </div>
          )}
          {error && items.length > 0 && <p className="mt-4 text-center text-[13px] text-danger">{error.message}</p>}
        </>
      )}
    </>
  );
}
