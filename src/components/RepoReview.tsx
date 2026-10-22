import { Bot, Check, CircleCheck, CircleX, GitCommitHorizontal, Bug, ListChecks, Loader2, MessageSquare, Sparkles, Tag } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { api, post } from '../lib/api.ts';
import { timeAgo } from '../lib/format.ts';
import { invalidate, setQueryData, useQuery } from '../lib/query.ts';
import { useToast } from '../lib/toast.tsx';
import { Badge, Button, Card, CodeBlock, cn } from './ui.tsx';

interface Review {
  fullName: string;
  targetStack: string | null;
  verdict: 'solid' | 'usable' | 'caution' | 'avoid';
  summary: string;
  whatItDoes: string;
  health: { status: 'healthy' | 'mixed' | 'concerning'; notes: string[] };
  knownIssues: string[];
  stackFit: { verdict: 'good' | 'possible' | 'poor' | 'unknown'; explanation: string; steps: string[] } | null;
  setup: string[];
  agentBrief: string;
  evidence: {
    checks: { total: number; passed: number; failed: number; pending: number; failing: string[] } | null;
    lastCommitAt: string | null;
    openBugs: number | null;
    topIssues: { title: string; comments: number; labels: string[]; url: string }[];
    latestRelease: { tag: string; publishedAt: string; url: string } | null;
  };
  generatedAt: string;
  cached?: boolean;
}

interface ReviewState {
  enabled?: boolean;
  review: Review | null;
  remaining: number;
  limit?: number;
}

const VERDICT = {
  solid: { label: 'Solid', tone: 'success' },
  usable: { label: 'Usable', tone: 'accent' },
  caution: { label: 'Use with caution', tone: 'warning' },
  avoid: { label: 'Avoid', tone: 'danger' },
} as const;

const FIT = {
  good: { label: 'Good fit', tone: 'success' },
  possible: { label: 'Possible fit', tone: 'warning' },
  poor: { label: 'Poor fit', tone: 'danger' },
  unknown: { label: 'Fit unknown', tone: 'neutral' },
} as const;

const STEPS = ['Checking CI, commits and issues on GitHub', 'Reading the README', 'Writing the review and agent brief'];

function Progress() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = [setTimeout(() => setStep(1), 2500), setTimeout(() => setStep(2), 5000)];
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <ol className="mt-4 grid gap-2" aria-live="polite">
      {STEPS.map((label, i) => (
        <li key={label} className={cn('flex items-center gap-2.5 text-[13px]', i > step ? 'text-fg-subtle' : 'text-fg')}>
          {i < step ? <Check className="size-4 text-success" aria-hidden /> : i === step ? <Loader2 className="size-4 animate-spin text-accent" aria-hidden /> : <span className="grid size-4 place-items-center" aria-hidden><span className="size-1.5 rounded-full bg-fg-subtle" /></span>}
          {label}
        </li>
      ))}
    </ol>
  );
}

function Fact({ icon, tone = 'neutral', children }: { icon: ReactNode; tone?: 'neutral' | 'success' | 'danger'; children: ReactNode }) {
  return (
    <li
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-[12.5px] tabular [&>svg]:size-3.5',
        tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-fg-muted',
      )}
    >
      {icon}
      <span className="text-fg">{children}</span>
    </li>
  );
}

function List({ items, ordered }: { items: string[]; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className="mt-2 space-y-1.5 text-[13.5px] text-fg-muted">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="w-4 shrink-0 text-right font-mono text-[12px] leading-[22px] text-fg-subtle" aria-hidden>
            {ordered ? `${i + 1}.` : '•'}
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </Tag>
  );
}

/** Gemini review of one repository, grounded in GitHub evidence, with a copyable agent brief. */
export function RepoReview({ fullName, stack }: { fullName: string; stack: string }) {
  const toast = useToast();
  const key = `review:${fullName.toLowerCase()}:${stack}`;
  const qs = stack ? `?stack=${encodeURIComponent(stack)}` : '';
  const { data, error, loading } = useQuery<ReviewState>(key, () => api(`/api/v1/repos/${fullName}/review${qs}`), 5 * 60_000);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const res = await post<ReviewState>(`/api/v1/repos/${fullName}/review`, { targetStack: stack });
      setQueryData<ReviewState>(key, (prev) => ({ ...prev, review: res.review, remaining: res.remaining }));
      invalidate('ai-status');
      invalidate('searches');
    } catch (err) {
      toast({ tone: 'error', title: 'Review failed', description: (err as Error).message });
    } finally {
      setRunning(false);
    }
  };

  if (data && data.enabled === false) return null;
  const review = data?.review;

  return (
    <Card className="p-5" aria-labelledby="ai-review-title">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="size-4 text-accent" aria-hidden />
        <h2 id="ai-review-title" className="text-base font-semibold">
          AI review
        </h2>
        {review && <Badge tone={VERDICT[review.verdict].tone}>{VERDICT[review.verdict].label}</Badge>}
        {review && (
          <span className="ml-auto text-[12px] text-fg-subtle" title={new Date(review.generatedAt).toLocaleString()}>
            Gemini · {timeAgo(review.generatedAt)}
          </span>
        )}
      </div>

      {!review && (
        <>
          <p className="mt-1.5 text-[13.5px] text-fg-muted">
            Checks CI on the latest commit, recent activity and open issues, then judges whether it works, what tends to break
            {stack ? <> and how it fits <span className="text-fg">{stack}</span></> : ''} — and writes a brief your coding agent can use.
          </p>
          {running ? (
            <Progress />
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="primary" icon={<Sparkles className="size-4" aria-hidden />} onClick={() => void run()} disabled={loading || Boolean(error) || data?.remaining === 0}>
                Run AI review
              </Button>
              {error ? (
                <span className="text-[12px] text-danger">{error.message}</span>
              ) : (
                data && (
                  <span className="text-[12px] text-fg-subtle">
                    {data.remaining === 0 ? 'Daily AI limit reached — try again tomorrow' : `${data.remaining} AI requests left today`}
                  </span>
                )
              )}
            </div>
          )}
        </>
      )}

      {review && (
        <div className="mt-3 space-y-5">
          <p className="text-[14px] leading-6 text-fg">{review.summary}</p>

          <section aria-label="Evidence from GitHub">
            <h3 className="text-[12px] font-medium text-fg-subtle">From GitHub</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {review.evidence.checks ? (
                review.evidence.checks.failed > 0 ? (
                  <Fact icon={<CircleX />} tone="danger">
                    CI {review.evidence.checks.failed} of {review.evidence.checks.total} failing
                  </Fact>
                ) : (
                  <Fact icon={<CircleCheck />} tone="success">
                    CI {review.evidence.checks.passed}/{review.evidence.checks.total} passing
                    {review.evidence.checks.pending ? `, ${review.evidence.checks.pending} running` : ''}
                  </Fact>
                )
              ) : (
                <Fact icon={<ListChecks />}>No CI checks found</Fact>
              )}
              {review.evidence.lastCommitAt && <Fact icon={<GitCommitHorizontal />}>Last commit {timeAgo(review.evidence.lastCommitAt)}</Fact>}
              {review.evidence.openBugs !== null && <Fact icon={<Bug />}>{review.evidence.openBugs} open bugs</Fact>}
              {review.evidence.latestRelease && <Fact icon={<Tag />}>{review.evidence.latestRelease.tag}</Fact>}
            </ul>
          </section>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {review.health.notes.length > 0 && (
              <section>
                <h3 className="text-[13px] font-semibold text-fg">Health · {review.health.status}</h3>
                <List items={review.health.notes} />
              </section>
            )}
            {review.knownIssues.length > 0 && (
              <section>
                <h3 className="text-[13px] font-semibold text-fg">What users report</h3>
                <List items={review.knownIssues} />
              </section>
            )}
          </div>

          {review.stackFit && (
            <section className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[13px] font-semibold text-fg">Fit with {review.targetStack}</h3>
                <Badge tone={FIT[review.stackFit.verdict].tone}>{FIT[review.stackFit.verdict].label}</Badge>
              </div>
              <p className="mt-1.5 text-[13.5px] text-fg-muted">{review.stackFit.explanation}</p>
              {review.stackFit.steps.length > 0 && <List items={review.stackFit.steps} ordered />}
            </section>
          )}

          {review.setup.length > 0 && (
            <section>
              <h3 className="text-[13px] font-semibold text-fg">Getting started</h3>
              <List items={review.setup} ordered />
            </section>
          )}

          {review.agentBrief && (
            <section>
              <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-fg">
                <Bot className="size-3.5 text-fg-subtle" aria-hidden /> Brief for your coding agent
              </h3>
              <CodeBlock className="mt-2 [&_pre]:max-h-64 [&_pre]:whitespace-pre-wrap" code={review.agentBrief} />
              <p className="mt-1.5 text-[12px] text-fg-subtle">Agents can fetch this directly with the review_repository MCP tool.</p>
            </section>
          )}

          {review.evidence.topIssues.some((i) => i.url.startsWith('https://github.com/')) && (
            <details className="group">
              <summary className="cursor-pointer text-[13px] font-medium text-link hover:underline">Most-discussed open issues</summary>
              <ul className="mt-2 space-y-1.5">
                {review.evidence.topIssues
                  .filter((i) => i.url.startsWith('https://github.com/'))
                  .slice(0, 6)
                  .map((issue) => (
                    <li key={issue.url} className="flex items-start gap-2 text-[13px]">
                      <MessageSquare className="mt-1 size-3.5 shrink-0 text-fg-subtle" aria-hidden />
                      <a href={issue.url} target="_blank" rel="noreferrer" className="min-w-0 text-fg-muted hover:text-fg hover:underline">
                        {issue.title}
                      </a>
                      <span className="ml-auto shrink-0 font-mono text-[12px] tabular text-fg-subtle">{issue.comments}</span>
                    </li>
                  ))}
              </ul>
            </details>
          )}

          <p className="border-t border-border pt-3 text-[12px] text-fg-subtle">
            AI can be wrong. This review is based on GitHub data and the README; Replex doesn’t run the code.
          </p>
        </div>
      )}
    </Card>
  );
}
