import { Github, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../lib/auth.tsx';
import { accountsEnabled } from '../lib/supabase.ts';
import { useToast } from '../lib/toast.tsx';
import { Button, PageHeader, Skeleton } from './ui.tsx';

export function RequireAuth({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const { ready, user, signInWithGitHub } = useAuth();
  const toast = useToast();

  if (!ready) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-3 h-4 w-80" />
        <Skeleton className="mt-8 h-48" />
      </div>
    );
  }
  if (user) return <>{children}</>;

  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface px-6 py-14 text-center shadow-sm">
        <div className="accent-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid size-11 place-items-center rounded-lg border border-border bg-elevated shadow-sm">
          <Lock className="size-5 text-fg-muted" aria-hidden />
        </div>
        <h2 className="relative mt-4 text-lg font-semibold">Sign in to use your library</h2>
        <p className="relative mx-auto mt-1 max-w-md text-fg-muted">
          Your collections, search history and API keys are private to your account and available to your agents over MCP.
        </p>
        <Button
          variant="primary"
          size="lg"
          className="relative mt-6"
          icon={<Github className="size-4" aria-hidden />}
          onClick={() => {
            if (!accountsEnabled) {
              toast({ tone: 'error', title: 'Accounts are not configured on this server yet' });
              return;
            }
            void signInWithGitHub(window.location.pathname + window.location.search).catch((err) =>
              toast({ tone: 'error', title: 'Sign-in failed', description: (err as Error).message }),
            );
          }}
        >
          Continue with GitHub
        </Button>
        <p className="relative mt-3 text-[12px] text-fg-subtle">Replex only asks to read your public profile.</p>
      </div>
    </>
  );
}
