import { ArrowRight, Bot, Gauge, Github, Moon, Rocket, Search, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { Repository, TrendingWindow } from '../types/index.ts';
import { RepoCard, RepoGridSkeleton } from '../components/repo.tsx';
import { Button, CodeBlock, IconButton, Logo } from '../components/ui.tsx';
import { api } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';
import { useQuery } from '../lib/query.ts';
import { Link, useRouter } from '../lib/router.tsx';
import { accountsEnabled } from '../lib/supabase.ts';
import { useTheme } from '../lib/theme.tsx';
import { useToast } from '../lib/toast.tsx';

const EXAMPLES = ['reverse engineering', 'MCP servers', 'local LLM inference', 'shadcn blocks', 'self-hosted analytics'];

function Feature({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm surface-highlight">
      <div className="mb-4 grid size-9 place-items-center rounded-lg soft-accent [&>svg]:size-4">{icon}</div>
      <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
      <p className="mt-1.5 text-fg-muted">{children}</p>
    </div>
  );
}

export function LandingPage() {
  const { navigate } = useRouter();
  const { signInWithGitHub } = useAuth();
  const { resolved, setPreference } = useTheme();
  const toast = useToast();
  const [q, setQ] = useState('');
  const trending = useQuery<{ window: TrendingWindow; rising: Repository[] }>('trending:window=week', () => api('/api/v1/discover/trending?window=week'), 10 * 60_000);

  const signIn = async () => {
    if (!accountsEnabled) {
      navigate('/discover');
      return;
    }
    try {
      await signInWithGitHub('/discover');
    } catch (err) {
      toast({ tone: 'error', title: 'Sign-in failed', description: (err as Error).message });
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search');
  };

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-fg focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <header className="glass sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 rounded-md p-1" aria-label="Replex home">
            <Logo size={24} />
            <span className="text-[15px] font-semibold tracking-tight">Replex</span>
          </Link>
          <nav aria-label="Site" className="ml-4 hidden items-center gap-1 text-[13px] sm:flex">
            <Link to="/discover" className="rounded-sm px-2.5 py-1.5 text-fg-muted hover:bg-muted hover:text-fg">
              Discover
            </Link>
            <Link to="/search" className="rounded-sm px-2.5 py-1.5 text-fg-muted hover:bg-muted hover:text-fg">
              Search
            </Link>
            <a href="#agents" className="rounded-sm px-2.5 py-1.5 text-fg-muted hover:bg-muted hover:text-fg">
              For agents
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <IconButton label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`} onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}>
              {resolved === 'dark' ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
            </IconButton>
            <Button variant="primary" icon={<Github className="size-4" aria-hidden />} onClick={() => void signIn()}>
              <span className="max-sm:hidden">Sign in with GitHub</span>
              <span className="sm:hidden">Sign in</span>
            </Button>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="relative overflow-hidden border-b border-border">
          <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className="accent-glow pointer-events-none absolute inset-0" aria-hidden />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto max-w-3xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28"
          >
            <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-[12px] font-medium text-fg-muted shadow-sm">
              <span className="size-1.5 rounded-full bg-success" aria-hidden />
              Live GitHub search · MCP-native
            </p>
            <h1 id="page-title" tabIndex={-1} className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-fg outline-none sm:text-6xl">
              Find any repository.
              <br />
              <span className="text-fg-muted">Hand it to your agents.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-fg-muted sm:text-[17px]">
              Replex searches all of GitHub in real time, shows what’s rising this week, scores every project for agent-readiness, and gives Claude, Cursor and any MCP client a private line into your library.
            </p>

            <form role="search" onSubmit={submit} className="mx-auto mt-10 flex max-w-xl gap-2 rounded-xl border border-border-strong bg-surface p-1.5 shadow-lg">
              <label htmlFor="hero-search" className="sr-only">
                Search GitHub repositories
              </label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                <input
                  id="hero-search"
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search all of GitHub…"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-10 w-full rounded-md bg-transparent pl-9 pr-2 text-[15px] text-fg outline-none placeholder:text-fg-subtle pointer-coarse:h-12"
                />
              </div>
              <Button type="submit" variant="primary" size="lg">
                Search
              </Button>
            </form>
            <ul className="mt-4 flex flex-wrap justify-center gap-x-1 gap-y-2 text-[13px]" aria-label="Example searches">
              {EXAMPLES.map((ex) => (
                <li key={ex}>
                  <Link to={`/search?q=${encodeURIComponent(ex)}`} className="rounded-full px-2.5 py-1 text-fg-muted hover:bg-muted hover:text-fg">
                    {ex}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        </section>

        <section aria-labelledby="rising-now" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 id="rising-now" className="flex items-center gap-2 text-xl font-semibold">
                <Rocket className="size-5 text-accent" aria-hidden /> Rising this week
              </h2>
              <p className="mt-1 text-fg-muted">Repositories created in the last 7 days, ranked by stars. Live from GitHub.</p>
            </div>
            <Link to="/discover" className="hidden shrink-0 items-center gap-1 text-[13px] font-medium text-link hover:underline sm:inline-flex">
              See everything <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          {trending.data ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {trending.data.rising.slice(0, 6).map((r, i) => (
                <RepoCard key={r.fullName} repo={r} rank={i + 1} />
              ))}
            </div>
          ) : trending.error ? (
            <p className="text-fg-muted">Trending is unavailable right now — try Search instead.</p>
          ) : (
            <RepoGridSkeleton count={6} />
          )}
        </section>

        <section aria-labelledby="why" className="border-y border-border bg-surface/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 id="why" className="max-w-xl text-2xl font-semibold tracking-tight">
              Everything you need to pick the right dependency — and let your agent pick it too.
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Feature icon={<Search aria-hidden />} title="All of GitHub, live">
                Not a curated list. Every public repository, searchable by keyword, language, topic, age and stars.
              </Feature>
              <Feature icon={<Rocket aria-hidden />} title="Rising & breakout">
                Spot new projects early — what was created this week and is already gaining stars fast.
              </Feature>
              <Feature icon={<Gauge aria-hidden />} title="Agent readiness">
                A transparent 0–100 score for licence clarity, docs, types and install instructions.
              </Feature>
              <Feature icon={<Bot aria-hidden />} title="Your own MCP server">
                Your agents search, compare and save to your collections with a personal, revocable key.
              </Feature>
            </div>
          </div>
        </section>

        <section id="agents" aria-labelledby="agents-heading" className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-[13px] font-medium text-link">For agents</p>
            <h2 id="agents-heading" className="mt-2 text-3xl font-semibold tracking-tight">
              One line to connect Claude Code.
            </h2>
            <p className="mt-4 max-w-md text-fg-muted">
              Create a key, paste one command, and your coding agent can search GitHub, check compatibility with your stack, and save what it finds to your library. Works with Claude Desktop, Cursor, VS Code and any MCP client.
            </p>
            <Button variant="primary" size="lg" className="mt-8" icon={<Github className="size-4" aria-hidden />} onClick={() => void signIn()}>
              Get your API key
            </Button>
          </div>
          <CodeBlock
            label="Terminal"
            code={`claude mcp add --transport http replex \\\n  ${typeof window !== 'undefined' ? window.location.origin : 'https://replex.app'}/api/mcp \\\n  --header "Authorization: Bearer rpx_…"\n\n# then ask Claude:\n# "Find rising reverse-engineering tools this week\n#  and save the best three to my Security collection"`}
          />
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-[13px] text-fg-subtle sm:flex-row sm:items-center sm:px-6">
          <span className="flex items-center gap-2">
            <Logo size={18} /> Replex
          </span>
          <span className="sm:ml-auto">Data from the GitHub API. Not affiliated with GitHub.</span>
        </div>
      </footer>
    </div>
  );
}
