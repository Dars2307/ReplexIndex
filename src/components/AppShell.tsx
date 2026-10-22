import { AnimatePresence, motion } from 'motion/react';
import {
  Bot,
  ChevronsUpDown,
  Clock,
  Columns3,
  Compass,
  Github,
  Library,
  LogOut,
  Monitor,
  Moon,
  PanelLeft,
  Search,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { displayName, useAuth } from '../lib/auth.tsx';
import { useCompare } from '../lib/compare.tsx';
import { modKey } from '../lib/format.ts';
import { Link, useRouter } from '../lib/router.tsx';
import { accountsEnabled } from '../lib/supabase.ts';
import { useTheme, type ThemePreference } from '../lib/theme.tsx';
import { useToast } from '../lib/toast.tsx';
import { CommandPalette } from './CommandPalette.tsx';
import { Menu } from './Menu.tsx';
import { Avatar, Button, cn, IconButton, Kbd, Logo } from './ui.tsx';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  match: (path: string) => boolean;
  badge?: number;
}

function useNav(): { label: string; items: NavItem[] }[] {
  const { items: compared } = useCompare();
  return [
    {
      label: 'Discover',
      items: [
        { to: '/discover', label: 'Discover', icon: <Compass aria-hidden />, match: (p) => p === '/discover' || p === '/' },
        { to: '/search', label: 'Search', icon: <Search aria-hidden />, match: (p) => p.startsWith('/search') || p.startsWith('/repo/') },
        { to: '/compare', label: 'Compare', icon: <Columns3 aria-hidden />, match: (p) => p.startsWith('/compare'), badge: compared.length || undefined },
      ],
    },
    {
      label: 'Your library',
      items: [
        { to: '/library', label: 'Collections', icon: <Library aria-hidden />, match: (p) => p.startsWith('/library') },
        { to: '/history', label: 'History', icon: <Clock aria-hidden />, match: (p) => p.startsWith('/history') },
      ],
    },
    {
      label: 'Build',
      items: [{ to: '/agents', label: 'Agents & MCP', icon: <Bot aria-hidden />, match: (p) => p.startsWith('/agents') }],
    },
  ];
}

const THEME_ICON: Record<ThemePreference, ReactNode> = {
  light: <Sun aria-hidden />,
  dark: <Moon aria-hidden />,
  system: <Monitor aria-hidden />,
};

function AccountMenu({ collapsed, side = 'top', align = 'start' }: { collapsed?: boolean; side?: 'top' | 'bottom'; align?: 'start' | 'end' }) {
  const { user, profile, signOut, signInWithGitHub, ready } = useAuth();
  const { preference, setPreference } = useTheme();
  const { navigate } = useRouter();
  const toast = useToast();

  if (!ready) return <div className="h-10" />;

  if (!user) {
    return collapsed ? (
      <IconButton label="Sign in with GitHub" variant="secondary" onClick={() => void signIn()}>
        <Github className="size-4" aria-hidden />
      </IconButton>
    ) : (
      <Button variant="primary" className="w-full" icon={<Github className="size-4" aria-hidden />} onClick={() => void signIn()}>
        Sign in with GitHub
      </Button>
    );
  }

  async function signIn() {
    if (!accountsEnabled) {
      toast({ tone: 'error', title: 'Accounts are not configured on this server yet' });
      return;
    }
    try {
      await signInWithGitHub(window.location.pathname + window.location.search);
    } catch (err) {
      toast({ tone: 'error', title: 'Sign-in failed', description: (err as Error).message });
    }
  }

  const name = displayName(user, profile);
  const avatar = profile?.avatar_url || (user.user_metadata?.avatar_url as string | undefined);
  const nextTheme: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' };

  return (
    <Menu
      side={side}
      align={align}
      header={
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{name}</p>
          {profile?.github_login && <p className="truncate text-[12px] text-fg-subtle">@{profile.github_login}</p>}
        </div>
      }
      items={[
        { label: 'Settings', icon: <Settings />, onSelect: () => navigate('/settings') },
        { label: 'Agents & API keys', icon: <Bot />, onSelect: () => navigate('/agents') },
        {
          label: `Theme: ${preference[0].toUpperCase()}${preference.slice(1)}`,
          icon: THEME_ICON[preference],
          hint: 'Change',
          onSelect: () => setPreference(nextTheme[preference]),
        },
        'separator',
        { label: 'Sign out', icon: <LogOut />, danger: true, onSelect: () => void signOut().then(() => navigate('/')) },
      ]}
      trigger={(props) => (
        <button
          type="button"
          onClick={props.toggle}
          id={props.id}
          aria-expanded={props['aria-expanded']}
          aria-haspopup={props['aria-haspopup']}
          aria-label={collapsed ? `Account menu for ${name}` : undefined}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-md text-left hover:bg-muted pointer-coarse:min-h-11',
            collapsed ? 'size-9 justify-center' : 'h-11 px-2',
          )}
        >
          <Avatar src={avatar} alt="" size={collapsed ? 26 : 28} />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-fg">{name}</span>
                {profile?.github_login && <span className="block truncate text-[12px] text-fg-subtle">@{profile.github_login}</span>}
              </span>
              <ChevronsUpDown className="size-4 text-fg-subtle" aria-hidden />
            </>
          )}
        </button>
      )}
    />
  );
}

function Sidebar({ collapsed, onToggle, onSearch }: { collapsed: boolean; onToggle: () => void; onSearch: () => void }) {
  const { location } = useRouter();
  const groups = useNav();
  return (
    <aside
      aria-label="Primary"
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface/60 transition-[width] duration-200 ease-out md:flex',
        collapsed ? 'w-[60px]' : 'w-60',
      )}
    >
      <div className={cn('flex h-14 items-center gap-2 px-3', collapsed && 'justify-center px-0')}>
        <Link to="/discover" className="flex min-w-0 items-center gap-2 rounded-md p-1 outline-none" aria-label="Replex home">
          <Logo size={24} />
          {!collapsed && <span className="text-[15px] font-semibold tracking-tight text-fg">Replex</span>}
        </Link>
        {!collapsed && (
          <IconButton label={`Collapse sidebar (${modKey}+B)`} size="sm" className="ml-auto" onClick={onToggle}>
            <PanelLeft className="size-4" aria-hidden />
          </IconButton>
        )}
      </div>

      <div className={cn('px-3 pb-2', collapsed && 'px-2')}>
        {collapsed ? (
          <div className="grid gap-1">
            <IconButton label={`Expand sidebar (${modKey}+B)`} onClick={onToggle} className="w-full">
              <PanelLeft className="size-4 -scale-x-100" aria-hidden />
            </IconButton>
            <IconButton label={`Search (${modKey}+K)`} onClick={onSearch} className="w-full">
              <Search className="size-4" aria-hidden />
            </IconButton>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSearch}
            className="flex h-8 w-full items-center gap-2 rounded-sm border border-border bg-bg px-2.5 text-left text-fg-subtle shadow-sm hover:border-border-strong hover:text-fg-muted"
          >
            <Search className="size-4" aria-hidden />
            <span className="flex-1">Search GitHub…</span>
            <Kbd>{modKey === '⌘' ? '⌘K' : 'Ctrl K'}</Kbd>
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin" aria-label="Main">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed ? (
              <h2 className="mb-1 px-2 text-[12px] font-medium text-fg-subtle">{group.label}</h2>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-border" aria-hidden />
            )}
            <ul className="grid gap-0.5">
              {group.items.map((item) => {
                const active = item.match(location.pathname);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'relative flex h-8 items-center gap-2.5 rounded-sm px-2 text-[13px] font-medium outline-none transition-colors [&>svg]:size-4 [&>svg]:shrink-0',
                        collapsed && 'justify-center px-0',
                        active ? 'bg-muted text-fg' : 'text-fg-muted hover:bg-muted/70 hover:text-fg',
                      )}
                    >
                      {item.icon}
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {item.badge !== undefined &&
                        (collapsed ? (
                          <span className="absolute right-1.5 top-1 size-1.5 rounded-full bg-accent" aria-label={`${item.badge} queued`} />
                        ) : (
                          <span className="rounded-xs bg-accent px-1.5 font-mono text-[11px] text-accent-fg tabular">{item.badge}</span>
                        ))}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn('border-t border-border p-3', collapsed && 'flex justify-center p-2')}>
        <AccountMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}

function MobileBar({ onSearch }: { onSearch: () => void }) {
  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border px-3 pt-[env(safe-area-inset-top)] md:hidden">
      <Link to="/discover" className="flex items-center gap-2 rounded-md p-1" aria-label="Replex home">
        <Logo size={24} />
        <span className="text-[15px] font-semibold tracking-tight">Replex</span>
      </Link>
      <div className="ml-auto flex items-center gap-1">
        <IconButton label="Search" onClick={onSearch}>
          <Search className="size-5" aria-hidden />
        </IconButton>
        <div className="w-11">
          {/* The avatar sits at the right edge on phones, so open leftward. */}
          <AccountMenu collapsed side="bottom" align="end" />
        </div>
      </div>
    </header>
  );
}

function MobileTabs() {
  const { location } = useRouter();
  const { items: compared } = useCompare();
  const tabs = [
    { to: '/discover', label: 'Discover', icon: Compass, match: (p: string) => p === '/discover' || p === '/' },
    { to: '/search', label: 'Search', icon: Search, match: (p: string) => p.startsWith('/search') || p.startsWith('/repo/') },
    { to: '/compare', label: 'Compare', icon: Columns3, match: (p: string) => p.startsWith('/compare'), badge: compared.length },
    { to: '/library', label: 'Library', icon: Library, match: (p: string) => p.startsWith('/library') || p.startsWith('/history') },
    { to: '/agents', label: 'Agents', icon: Bot, match: (p: string) => p.startsWith('/agents') || p.startsWith('/settings') },
  ];
  return (
    <nav aria-label="Main" className="glass fixed inset-x-0 bottom-0 z-30 border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon, match, badge }) => {
          const active = match(location.pathname);
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={cn('relative flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium', active ? 'text-fg' : 'text-fg-subtle')}
              >
                <Icon className="size-5" aria-hidden />
                {label}
                {badge ? <span className="absolute right-[calc(50%-18px)] top-2 size-2 rounded-full bg-accent" aria-label={`${badge} queued`} /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function CompareTray() {
  const { items, remove, clear } = useCompare();
  const { location } = useRouter();
  const show = items.length > 0 && !location.pathname.startsWith('/compare');
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12, transition: { duration: 0.14 } }}
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          className="fixed inset-x-3 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-2xl items-center gap-2 rounded-xl border border-border bg-elevated p-2 shadow-lg surface-highlight md:bottom-5"
          role="region"
          aria-label="Compare tray"
        >
          <Columns3 className="ml-1.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
          <ul className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto scrollbar-thin">
            {items.map((n) => (
              <li key={n} className="flex h-7 shrink-0 items-center gap-1 rounded-sm bg-muted pl-2 pr-0.5 text-[13px]">
                <span className="max-w-40 truncate font-mono text-[12px]" translate="no">
                  {n}
                </span>
                <button type="button" onClick={() => remove(n)} aria-label={`Remove ${n}`} className="grid size-6 place-items-center rounded-xs text-fg-subtle hover:bg-muted-strong hover:text-fg">
                  <X className="size-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="ghost" onClick={clear} className="hidden sm:inline-flex">
            Clear
          </Button>
          <Link
            to={`/compare?repos=${items.map(encodeURIComponent).join(',')}`}
            className="inline-flex h-7 shrink-0 items-center rounded-sm bg-primary px-2.5 text-[13px] font-medium text-primary-fg hover:opacity-90 pointer-coarse:h-11"
          >
            Compare {items.length}
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('replex-sidebar') === 'collapsed';
    } catch {
      return false;
    }
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { location } = useRouter();
  const { items: compared } = useCompare();
  const trayVisible = compared.length > 0 && !location.pathname.startsWith('/compare');

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem('replex-sidebar', c ? 'expanded' : 'collapsed');
      } catch {
        /* storage unavailable */
      }
      return !c;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggle();
      } else if (e.key === '/' && !(e.target as HTMLElement).closest('input, textarea, [contenteditable]')) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  // Move focus to the new page's heading so screen readers announce it.
  useEffect(() => {
    const id = requestAnimationFrame(() => document.getElementById('page-title')?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-[200] rounded-md bg-primary px-3 py-2 text-primary-fg focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggle={toggle} onSearch={() => setPaletteOpen(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileBar onSearch={() => setPaletteOpen(true)} />
        {/* Extra bottom room when the floating compare tray is showing, so it never covers content. */}
        <main
          id="main"
          className={cn(
            'mx-auto w-full max-w-7xl flex-1 px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10',
            trayVisible ? 'pb-44 md:pb-28' : 'pb-28 md:pb-16',
          )}
        >
          {children}
        </main>
      </div>
      <MobileTabs />
      <CompareTray />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
