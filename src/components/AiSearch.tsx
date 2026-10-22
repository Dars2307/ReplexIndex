import { Check, Github, Loader2, SearchX, Sparkles } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { Repository } from '../types/index.ts';
import { api, post } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';
import { invalidate, useQuery } from '../lib/query.ts';
import { useSearchParams } from '../lib/router.tsx';
import { accountsEnabled } from '../lib/supabase.ts';
import { useToast } from '../lib/toast.tsx';
import { RepoCard, RepoGridSkeleton, type RepoInsight } from './repo.tsx';
import { Button, cn, EmptyState, ErrorState } from './ui.tsx';

interface AiResult {
  prompt: string;
  interpretation: string;
  queries: string[];
  results: { repository: Repository; verdict: RepoInsight['verdict'] | null; score: number; why: string }[];
  verified: boolean;
  considered: number;
  confirmedSuggestions: number;
  model: string;
  remaining: number;
  cached?: boolean;
}

interface AiStatus {
  enabled: boolean;
  signedIn: boolean;
  limit: number;
  remaining: number;
}

const EXAMPLES = [
  'A self-hosted alternative to Notion with real-time collaboration',
  'Decompile an Android APK back to readable Java',
  'Open-source tool to record and replay browser sessions for debugging',
  'React component library for data-dense dashboards with good accessibility',
];

const STEPS = ['Understanding your request', 'Searching GitHub', 'Checking each result against what you asked'];

function Progress() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = [setTimeout(() => setStep(1), 3500), setTimeout(() => setStep(2), 7000)];
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <ol className="mb-6 grid gap-2 rounded-lg border border-border bg-surface p-4" aria-live="polite">
      {STEPS.map((label, i) => (
        <li key={label} className={cn('flex items-center gap-2.5 text-[13px]', i > step ? 'text-fg-subtle' : 'text-fg')}>
          {i < step ? (
            <Check className="size-4 text-success" aria-hidden />
          ) : i === step ? (
            <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
          ) : (
            <span className="grid size-4 place-items-center" aria-hidden>
              <span className="size-1.5 rounded-full bg-fg-subtle" />
            </span>
          )}
          {label}
          {i === step && <span className="sr-only">(in progress)</span>}
        </li>
      ))}
    </ol>
  );
}

export function AiSearch() {
  const { user, signInWithGitHub } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const ask = params.get('ask') || '';
  const [draft, setDraft] = useState(ask);
  useEffect(() => setDraft(ask), [ask]);

  const status = useQuery<AiStatus>(user ? 'ai-status' : 'ai-status:anon', () => api('/api/v1/ai/status'), 30_000);
  const result = useQuery<AiResult>(
    ask && user ? `ai:${ask.toLowerCase()}` : null,
    async () => {
      const r = await post<AiResult>('/api/v1/ai/search', { prompt: ask });
      invalidate('ai-status');
      invalidate('searches');
      return r;
    },
    60 * 60_000,
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = draft.trim();
    if (value.length < 3) return;
    setParams({ ask: value });
  };

  if (status.data && !status.data.enabled) {
    return <ErrorState message="AI search isn’t configured on this server yet." />;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-surface px-6 py-10 text-center">
        <Sparkles className="mx-auto size-6 text-accent" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold">Ask in plain English</h2>
        <p className="mx-auto mt-1 max-w-md text-fg-muted">
          Describe what you need. Replex’s AI searches GitHub several ways, then reads each result to confirm it actually fits. Free with an account.
        </p>
        <Button
          variant="primary"
          size="lg"
          className="mt-5"
          icon={<Github className="size-4" aria-hidden />}
          onClick={() => {
            if (!accountsEnabled) return toast({ tone: 'error', title: 'Accounts are not configured on this server yet' });
            void signInWithGitHub(window.location.pathname + window.location.search);
          }}
        >
          Sign in to use AI search
        </Button>
      </div>
    );
  }

  const remaining = result.data?.remaining ?? status.data?.remaining;
  const outOfSearches = remaining === 0 && !result.data;

  return (
    <>
      <form onSubmit={submit} className="mb-2">
        <label htmlFor="ai-ask" className="sr-only">
          Describe what you are looking for
        </label>
        <div className="flex flex-col gap-2 rounded-xl border border-border-strong bg-surface p-2 shadow-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25 sm:flex-row sm:items-end">
          <textarea
            id="ai-ask"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit(e);
              }
            }}
            rows={2}
            maxLength={400}
            placeholder="Describe what you need — e.g. “a self-hosted alternative to Notion with real-time collaboration”"
            className="min-h-14 flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] leading-6 text-fg outline-none placeholder:text-fg-subtle"
          />
          <Button type="submit" variant="accent" size="lg" loading={result.loading && Boolean(ask)} disabled={draft.trim().length < 3 || outOfSearches} icon={<Sparkles className="size-4" aria-hidden />}>
            Ask AI
          </Button>
        </div>
      </form>
      <p className="mb-6 text-[12px] text-fg-subtle">
        {remaining !== undefined ? `${remaining} of ${status.data?.limit ?? 25} AI searches left today · ` : ''}AI can be wrong — check the README before you depend on a project.
      </p>

      {!ask && (
        <section aria-labelledby="ai-examples">
          <h2 id="ai-examples" className="mb-3 text-[13px] font-medium text-fg-subtle">
            Try asking
          </h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {EXAMPLES.map((ex) => (
              <li key={ex}>
                <button
                  type="button"
                  onClick={() => setParams({ ask: ex })}
                  disabled={outOfSearches}
                  className="flex w-full items-start gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-3 text-left text-fg-muted hover:border-border-strong hover:text-fg disabled:opacity-50"
                >
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                  {ex}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ask && result.loading && !result.data && (
        <>
          <Progress />
          <RepoGridSkeleton count={6} />
        </>
      )}

      {ask && result.error && <ErrorState message={result.error.message} onRetry={result.refetch} />}

      {result.data && (
        <section aria-labelledby="ai-results">
          <div className="mb-5 rounded-lg border border-border bg-surface p-4">
            <h2 id="ai-results" className="flex items-center gap-2 text-[13px] font-medium text-fg-subtle">
              <Sparkles className="size-3.5 text-accent" aria-hidden /> How the AI read your request
            </h2>
            <p className="mt-1.5 text-fg">{result.data.interpretation}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] text-fg-subtle">Searched:</span>
              {result.data.queries.map((q) => (
                <code key={q} className="max-w-full truncate rounded-xs bg-muted px-1.5 py-0.5 font-mono text-[12px] text-fg-muted">
                  {q}
                </code>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-fg-subtle" aria-live="polite">
              Checked {result.data.considered} candidates · {result.data.confirmedSuggestions} AI suggestions confirmed on GitHub
              {result.data.verified ? ` · ${result.data.results.filter((r) => r.verdict === 'match').length} strong matches` : ''}
              {result.data.cached ? ' · from cache' : ''}
            </p>
            {!result.data.verified && (
              <p role="status" className="mt-3 rounded-md soft-warning px-3 py-2 text-[13px]">
                The AI couldn’t double-check these results right now (its free tier is busy), so they’re shown unverified. Try again in a minute for match ratings.
              </p>
            )}
          </div>

          {result.data.results.length === 0 ? (
            <EmptyState
              icon={<SearchX className="size-5" aria-hidden />}
              title="Nothing fit closely enough"
              description="The AI checked every candidate and none matched. Try describing it differently, or use regular search."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {result.data.results.map(({ repository, verdict, score, why }) => (
                <RepoCard key={repository.fullName} repo={repository} insight={verdict ? { verdict, score, why } : undefined} />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
