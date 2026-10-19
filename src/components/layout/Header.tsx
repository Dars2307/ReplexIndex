import React, { useState } from 'react';
import { Sun, Moon, Sliders, Search, User, Check, ShieldCheck, Sparkles, LogOut, Key } from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton.tsx';
import type { UserPreferences } from '../../services/storage.ts';

export type NavView = 'discover' | 'search' | 'compare' | 'library' | 'platform';

interface HeaderProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  unreadNotificationsCount: number;
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: Partial<UserPreferences>) => void;
  onOpenSettings: () => void;
  onOpenGlobalSearch: () => void;
  compareCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  unreadNotificationsCount,
  preferences,
  onUpdatePreferences,
  onOpenSettings,
  onOpenGlobalSearch,
  compareCount,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);

  const toggleTheme = () => {
    onUpdatePreferences({ theme: preferences.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--canvas)]/90 backdrop-blur-md transition-colors">
      <div className="flex items-center justify-between gap-4 h-14 px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => onNavigate('discover')}
          className="flex items-center gap-2.5 text-left text-lg font-bold tracking-tight text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors whitespace-nowrap shrink-0 group cursor-pointer"
          aria-label="Nexora Home"
        >
          <div className="w-7 h-7 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] group-hover:border-[var(--accent)]/50 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9" />
            </svg>
          </div>
          <span className="font-display">Nexora</span>
        </button>

        {/* Zone 2: Navigation Links (Discover, Search, Compare, Library, Platform) */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-[var(--text-secondary)]">
          <button
            onClick={() => onNavigate('discover')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
              currentView === 'discover' ? 'text-[var(--accent)] font-semibold' : 'hover:text-[var(--text-primary)]'
            }`}
          >
            Discover
          </button>

          <button
            onClick={() => onNavigate('search')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
              currentView === 'search' ? 'text-[var(--accent)] font-semibold' : 'hover:text-[var(--text-primary)]'
            }`}
          >
            Search
          </button>

          <button
            onClick={() => onNavigate('compare')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 flex items-center gap-1.5 cursor-pointer ${
              currentView === 'compare' ? 'text-[var(--accent)] font-semibold' : 'hover:text-[var(--text-primary)]'
            }`}
          >
            <span>Compare</span>
            {compareCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-mono tabular-nums">
                {compareCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate('library')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 flex items-center gap-1.5 cursor-pointer ${
              currentView === 'library' ? 'text-[var(--accent)] font-semibold' : 'hover:text-[var(--text-primary)]'
            }`}
          >
            <span>Library</span>
            {unreadNotificationsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" title={`${unreadNotificationsCount} unread updates`} />
            )}
          </button>

          <button
            onClick={() => onNavigate('platform')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
              currentView === 'platform' ? 'text-[var(--accent)] font-semibold' : 'hover:text-[var(--text-primary)]'
            }`}
          >
            Platform & MCP
          </button>
        </nav>

        {/* Zone 3: Global Search Quick Trigger */}
        <div className="flex-1 max-w-xs hidden sm:flex items-center">
          <button
            type="button"
            onClick={onOpenGlobalSearch}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-xl transition-colors group cursor-pointer"
            aria-label="Search repositories (Cmd+K)"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span className="truncate">Search all tools...</span>
            </div>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--canvas)] rounded border border-[var(--border-subtle)] shrink-0">
              <span>⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Zone 4: Profile, Controls & Settings */}
        <div className="flex items-center gap-2 shrink-0 relative">
          {/* Mobile search trigger icon */}
          <button
            onClick={onOpenGlobalSearch}
            className="sm:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)] rounded-md transition-colors"
            aria-label="Search all tools"
          >
            <Search className="w-4 h-4 text-[var(--accent)]" />
          </button>

          {/* Active Target Stack quick indicator */}
          <button
            onClick={onOpenSettings}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
            title="Current target environment stack"
          >
            <span className="text-[var(--text-muted)] text-[11px]">Stack:</span>
            <span className="text-[var(--accent)] font-mono font-medium max-w-[100px] truncate">{preferences.targetStack}</span>
          </button>

          <PWAInstallButton />

          <button
            onClick={toggleTheme}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)] rounded-lg transition-colors cursor-pointer"
            aria-label={`Switch to ${preferences.theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {preferences.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)] rounded-lg transition-colors cursor-pointer"
            aria-label="Settings and Stack Preferences"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Frictionless Guest Profile Button (Stripe/Supabase style) */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] transition-colors cursor-pointer"
              aria-label="User session profile"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[var(--accent)] to-cyan-400 flex items-center justify-center text-[#0B1018] font-bold text-[10px]">
                G
              </div>
              <span className="hidden xl:inline text-[11px] font-medium text-[var(--text-secondary)]">Guest Dev</span>
            </button>

            {/* Profile Popover */}
            {profileOpen && (
              <div
                className="absolute right-0 top-10 mt-1 w-64 p-4 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl shadow-xl z-50 text-xs animate-in fade-in duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border-subtle)] mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--accent)] to-cyan-400 flex items-center justify-center text-[#0B1018] font-bold text-xs">
                    G
                  </div>
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">Guest Developer</div>
                    <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Active Local Session
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-[11px] text-[var(--text-secondary)] mb-3">
                  <div className="flex justify-between">
                    <span>Storage Mode:</span>
                    <strong className="text-[var(--text-primary)] font-mono">Offline-First</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Stack:</span>
                    <strong className="text-[var(--accent)] font-mono truncate max-w-[120px]">{preferences.targetStack}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>MCP Server:</span>
                    <span className="text-emerald-400 font-medium">Ready</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <button
                    onClick={() => {
                      onOpenSettings();
                      setProfileOpen(false);
                    }}
                    className="text-[11px] text-[var(--accent)] hover:underline font-medium cursor-pointer"
                  >
                    Manage Settings
                  </button>
                  <button
                    onClick={() => setProfileOpen(false)}
                    className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
