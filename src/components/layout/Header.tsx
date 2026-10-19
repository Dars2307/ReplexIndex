import React from 'react';
import { Sun, Moon, Search } from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton.tsx';
import type { UserPreferences } from '../../services/storage.ts';

export type NavView = 'discover' | 'search' | 'compare' | 'library' | 'platform';

interface HeaderProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  unreadNotificationsCount: number;
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: Partial<UserPreferences>) => void;
  onOpenGlobalSearch: () => void;
  compareCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  unreadNotificationsCount,
  preferences,
  onUpdatePreferences,
  onOpenGlobalSearch,
  compareCount,
}) => {
  const toggleTheme = () => {
    onUpdatePreferences({ theme: preferences.theme === 'dark' ? 'light' : 'dark' });
  };

  const navItems: { view: NavView; label: string; badge?: number | boolean }[] = [
    { view: 'discover', label: 'Discover' },
    { view: 'search', label: 'Search' },
    { view: 'compare', label: 'Compare', badge: compareCount > 0 ? compareCount : undefined },
    { view: 'library', label: 'Library', badge: unreadNotificationsCount > 0 ? true : undefined },
    { view: 'platform', label: 'Platform' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--canvas)]/90 backdrop-blur-md transition-colors">
      <div className="flex items-center justify-between gap-4 h-14 px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Brand */}
        <button
          onClick={() => onNavigate('discover')}
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors shrink-0 group cursor-pointer"
          aria-label="Nexora Home"
        >
          <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent)]/20 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9" />
            </svg>
          </div>
          <span className="font-display">Nexora</span>
        </button>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {navItems.map(({ view, label, badge }) => (
            <button
              key={view}
              onClick={() => onNavigate(view)}
              className={`relative px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                currentView === view
                  ? 'text-[var(--accent)] bg-[var(--accent)]/10'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)]'
              }`}
            >
              {label}
              {typeof badge === 'number' && (
                <span className="ml-1.5 px-1.5 py-px rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-mono tabular-nums">
                  {badge}
                </span>
              )}
              {badge === true && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--accent)]" />
              )}
            </button>
          ))}
        </nav>

        {/* Search Bar */}
        <div className="flex-1 max-w-xs hidden sm:flex items-center">
          <button
            type="button"
            onClick={onOpenGlobalSearch}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-xl transition-colors cursor-pointer"
            aria-label="Search repositories (Cmd+K)"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span className="truncate">Search tools...</span>
            </div>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--canvas)] rounded border border-[var(--border-subtle)] shrink-0">
              <span>⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenGlobalSearch}
            className="sm:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)] rounded-lg transition-colors cursor-pointer"
            aria-label="Search"
          >
            <Search className="w-4 h-4 text-[var(--accent)]" />
          </button>

          <PWAInstallButton />

          <button
            onClick={toggleTheme}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)] rounded-lg transition-colors cursor-pointer"
            aria-label={`Switch to ${preferences.theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {preferences.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
