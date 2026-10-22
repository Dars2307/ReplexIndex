import { ArrowLeft, ExternalLink, Github } from 'lucide-react';
import { useState } from 'react';
import { Button, Logo } from '../components/ui.tsx';
import { useAuth } from '../lib/auth.tsx';
import { Link, matchPath } from '../lib/router.tsx';
import { useToast } from '../lib/toast.tsx';

/** Full-screen sign-in shown for any app page while signed out; `next` is where to return. */
export function SignInPage({ next }: { next: string }) {
  const { signInWithGitHub } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const repo = matchPath('/repo/:owner/:name', next.split('?')[0]);

  const signIn = async () => {
    setBusy(true);
    try {
      await signInWithGitHub(next);
    } catch (err) {
      setBusy(false);
      toast({ tone: 'error', title: 'Sign-in failed', description: (err as Error).message });
    }
  };

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="accent-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-sm">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg">
          <ArrowLeft className="size-3.5" aria-hidden /> Back to home
        </Link>
        <div className="rounded-xl border border-border bg-surface p-7 shadow-sm surface-highlight">
          <Logo size={32} />
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-balance">
            {repo ? 'Sign in to view this repository' : 'Sign in to Replex'}
          </h1>
          <p className="mt-1.5 text-fg-muted">
            {repo ? (
              <>
                Readiness, stack fit and the AI review for{' '}
                <span className="font-mono text-[13px] text-fg">
                  {repo.owner}/{repo.name}
                </span>{' '}
                are available once you sign in.
              </>
            ) : (
              'Search all of GitHub, save collections and connect your agents.'
            )}
          </p>
          <Button
            variant="primary"
            size="lg"
            className="mt-6 w-full"
            disabled={busy}
            icon={<Github className="size-4" aria-hidden />}
            onClick={() => void signIn()}
          >
            {busy ? 'Opening GitHub…' : 'Continue with GitHub'}
          </Button>
          <p className="mt-3 text-center text-[12px] text-fg-subtle">
            New here? This creates your account. Replex only reads your public profile.
          </p>
        </div>
        {repo && (
          <a
            href={`https://github.com/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-center gap-1.5 text-[13px] text-fg-muted hover:text-fg"
          >
            View on GitHub instead <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
      </div>
    </main>
  );
}
