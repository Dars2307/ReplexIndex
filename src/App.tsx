import { Compass, Loader2 } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { AppShell } from './components/AppShell.tsx';
import { EmptyState, Skeleton } from './components/ui.tsx';
import { useAuth } from './lib/auth.tsx';
import { Link, matchPath, useRouter } from './lib/router.tsx';
import { supabase } from './lib/supabase.ts';
import { DiscoverPage } from './pages/Discover.tsx';
import { LandingPage } from './pages/Landing.tsx';
import { SearchPage } from './pages/Search.tsx';

// First paint ships Landing/Discover/Search; everything else loads on demand.
const AgentsPage = lazy(() => import('./pages/Agents.tsx').then((m) => ({ default: m.AgentsPage })));
const ComparePage = lazy(() => import('./pages/Compare.tsx').then((m) => ({ default: m.ComparePage })));
const HistoryPage = lazy(() => import('./pages/History.tsx').then((m) => ({ default: m.HistoryPage })));
const LibraryPage = lazy(() => import('./pages/Library.tsx').then((m) => ({ default: m.LibraryPage })));
const CollectionPage = lazy(() => import('./pages/Library.tsx').then((m) => ({ default: m.CollectionPage })));
const RepoPage = lazy(() => import('./pages/Repo.tsx').then((m) => ({ default: m.RepoPage })));
const SettingsPage = lazy(() => import('./pages/Settings.tsx').then((m) => ({ default: m.SettingsPage })));

function PageFallback() {
  return (
    <div aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-3 h-4 w-80" />
      <Skeleton className="mt-8 h-64" />
    </div>
  );
}

const TITLES: [string, string][] = [
  ['/discover', 'Discover'],
  ['/search', 'Search'],
  ['/compare', 'Compare'],
  ['/library', 'Collections'],
  ['/history', 'History'],
  ['/agents', 'Agents & MCP'],
  ['/settings', 'Settings'],
];

function AuthCallback() {
  const { navigate, location } = useRouter();
  const { ready, session } = useAuth();
  const error = location.search.get('error_description');

  useEffect(() => {
    if (error) return;
    const next = location.search.get('next') || '/discover';
    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/discover';
    if (ready && session) {
      navigate(safeNext, { replace: true });
      return;
    }
    // PKCE: exchange the ?code for a session if auto-detection hasn't yet.
    const code = location.search.get('code');
    if (code && supabase) {
      void supabase.auth.exchangeCodeForSession(code).then(({ error: e }) => {
        if (e && !session) navigate('/?signin=failed', { replace: true });
      });
    }
  }, [ready, session, error, location.search, navigate]);

  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center" role="status">
      {error ? (
        <div>
          <h1 className="text-lg font-semibold">Sign-in didn’t complete</h1>
          <p className="mt-1 text-fg-muted">{error}</p>
          <Link to="/" className="mt-4 inline-block text-link hover:underline">
            Back to Replex
          </Link>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-fg-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Signing you in…
        </p>
      )}
    </div>
  );
}

function NotFound() {
  return (
    <EmptyState
      icon={<Compass className="size-5" aria-hidden />}
      title="Page not found"
      description="That page doesn’t exist. Try searching instead."
      action={
        <Link to="/discover" className="inline-flex h-8 items-center rounded-sm bg-primary px-3 text-sm font-medium text-primary-fg hover:opacity-90">
          Go to Discover
        </Link>
      }
    />
  );
}

function Routes(): ReactNode {
  const { location, navigate } = useRouter();
  const { ready, user } = useAuth();
  const path = location.pathname.replace(/\/+$/, '') || '/';

  useEffect(() => {
    const title = TITLES.find(([p]) => path.startsWith(p))?.[1];
    const repo = matchPath('/repo/:owner/:name', path);
    document.title = repo ? `${repo.owner}/${repo.name} · Replex` : title ? `${title} · Replex` : 'Replex — Find any repository. Hand it to your agents.';
  }, [path]);

  useEffect(() => {
    if (path === '/' && ready && user) navigate('/discover', { replace: true });
  }, [path, ready, user, navigate]);

  if (path === '/auth/callback') return <AuthCallback />;
  if (path === '/') return ready && user ? null : <LandingPage />;

  let page: ReactNode;
  const repo = matchPath('/repo/:owner/:name', path);
  const collection = matchPath('/library/:id', path);
  if (path === '/discover') page = <DiscoverPage />;
  else if (path === '/search') page = <SearchPage />;
  else if (repo) page = <RepoPage key={`${repo.owner}/${repo.name}`} owner={repo.owner} name={repo.name} />;
  else if (path === '/compare') page = <ComparePage />;
  else if (path === '/library') page = <LibraryPage />;
  else if (collection) page = <CollectionPage key={collection.id} id={collection.id} />;
  else if (path === '/history') page = <HistoryPage />;
  else if (path === '/agents') page = <AgentsPage />;
  else if (path === '/settings') page = <SettingsPage />;
  else page = <NotFound />;

  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>{page}</Suspense>
    </AppShell>
  );
}

export default function App() {
  const { profile } = useAuth();
  return (
    <MotionConfig reducedMotion={profile?.reduced_motion ? 'always' : 'user'}>
      <Routes />
    </MotionConfig>
  );
}
