import React, { useState, useEffect } from 'react';
import type { Repository, TechnicalCategory } from './types/index.ts';
import { storageService, UserPreferences } from './services/storage.ts';
import { Header, NavView } from './components/layout/Header.tsx';
import { MobileNav } from './components/layout/MobileNav.tsx';
import { DiscoverHome } from './components/discovery/DiscoverHome.tsx';
import { SearchWorkspace } from './components/search/SearchWorkspace.tsx';
import { CompareWorkspace } from './components/compare/CompareWorkspace.tsx';
import { LibraryWorkspace } from './components/library/LibraryWorkspace.tsx';
import { DeveloperPlatform } from './components/developer/DeveloperPlatform.tsx';
import { RepositoryDetailModal } from './components/detail/RepositoryDetailModal.tsx';
import { SettingsModal } from './components/settings/SettingsModal.tsx';
import { OfflineIndicator } from './components/pwa/OfflineIndicator.tsx';
import { GlobalSearchModal } from './components/search/GlobalSearchModal.tsx';

export default function App() {
  const [currentView, setCurrentView] = useState<NavView>('discover');
  const [repositories, setRepositories] = useState<Repository[]>(storageService.getRepositories());
  const [collections, setCollections] = useState(storageService.getCollections());
  const [watchlists, setWatchlists] = useState(storageService.getWatchlists());
  const [notifications, setNotifications] = useState(storageService.getNotifications());
  const [apiKeys, setApiKeys] = useState(storageService.getApiKeys());
  const [preferences, setPreferences] = useState<UserPreferences>(storageService.getPreferences());

  // Comparison state (up to 4 repositories)
  const [comparedRepoIds, setComparedRepoIds] = useState<string[]>(['remotion-dev/remotion', 'ffmpegwasm/ffmpeg.wasm']);

  // Selected repository for modal inspection
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);

  // Global Search modal state & query forwarding
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [activeSearchCategory, setActiveSearchCategory] = useState<TechnicalCategory | 'All'>('All');

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Quick save to collection modal
  const [savingRepo, setSavingRepo] = useState<Repository | null>(null);
  const [quickSaveFeedback, setQuickSaveFeedback] = useState<string | null>(null);

  // Synchronize document theme class whenever preferences change
  useEffect(() => {
    if (preferences.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [preferences.theme]);

  // Global keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to programmatic tab navigation custom events
  useEffect(() => {
    const handleTabNav = (e: any) => {
      if (e.detail && typeof e.detail === 'string') {
        setCurrentView(e.detail as NavView);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('navigate_tab', handleTabNav);
    return () => window.removeEventListener('navigate_tab', handleTabNav);
  }, []);

  // Subscribe to reactive storage updates
  useEffect(() => {
    const unsubscribe = storageService.subscribe(() => {
      setRepositories([...storageService.getRepositories()]);
      setCollections([...storageService.getCollections()]);
      setWatchlists([...storageService.getWatchlists()]);
      setNotifications([...storageService.getNotifications()]);
      setApiKeys([...storageService.getApiKeys()]);
      setPreferences({ ...storageService.getPreferences() });
    });
    return unsubscribe;
  }, []);

  const handleToggleCompare = (repo: Repository) => {
    setComparedRepoIds((prev) => {
      const exists = prev.some((id) => id.toLowerCase() === repo.id.toLowerCase());
      if (exists) {
        return prev.filter((id) => id.toLowerCase() !== repo.id.toLowerCase());
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, repo.id];
    });
  };

  const handleQuickSave = (collectionId: string) => {
    if (!savingRepo) return;
    const ok = storageService.addRepositoryToCollection(collectionId, savingRepo.id);
    if (ok) {
      setQuickSaveFeedback('Saved to collection!');
    } else {
      setQuickSaveFeedback('Already in this collection');
    }
    setTimeout(() => {
      setSavingRepo(null);
      setQuickSaveFeedback(null);
    }, 1500);
  };

  const handleSearchFromHome = (query: string, category?: TechnicalCategory | 'All') => {
    setActiveSearchQuery(query);
    if (category) setActiveSearchCategory(category);
    setCurrentView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className={`min-h-screen bg-[var(--canvas)] text-[var(--text-primary)] flex flex-col font-sans transition-colors ${preferences.reducedMotion ? 'motion-reduce' : ''}`}>
      {/* Precision Top Bar Navigation */}
      <Header
        currentView={currentView}
        onNavigate={(v) => {
          setCurrentView(v);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        unreadNotificationsCount={unreadNotifsCount}
        preferences={preferences}
        onUpdatePreferences={(p) => storageService.setPreferences(p)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        compareCount={comparedRepoIds.length}
      />

      {/* Main Unified Workspace */}
      <main className="flex-1 pb-16 md:pb-8">
        {/* 1. Discover Landing Home */}
        {currentView === 'discover' && (
          <DiscoverHome
            repositories={repositories}
            userStack={preferences.targetStack}
            onSearch={handleSearchFromHome}
            onSelectRepository={(repo) => setSelectedRepository(repo)}
            onToggleCompare={handleToggleCompare}
            comparedRepoIds={comparedRepoIds}
          />
        )}

        {/* 2. Dedicated Search & Directory Workspace */}
        {currentView === 'search' && (
          <SearchWorkspace
            repositories={repositories}
            userStack={preferences.targetStack}
            initialQuery={activeSearchQuery}
            initialCategory={activeSearchCategory}
            onSelectRepository={(repo) => setSelectedRepository(repo)}
            comparedRepoIds={comparedRepoIds}
            onToggleCompare={handleToggleCompare}
            onSaveToCollection={(repo) => setSavingRepo(repo)}
          />
        )}

        {/* 3. Compare Workspace */}
        {currentView === 'compare' && (
          <CompareWorkspace
            repositories={repositories}
            comparedRepoIds={comparedRepoIds}
            onRemoveFromCompare={(id) => setComparedRepoIds((prev) => prev.filter((item) => item !== id))}
            onAddRepoToCompare={(id) => setComparedRepoIds((prev) => (prev.length < 4 ? [...prev, id] : prev))}
            userStack={preferences.targetStack}
            onSelectRepository={(repo) => setSelectedRepository(repo)}
          />
        )}

        {/* 4. Library & Saved Stacks */}
        {currentView === 'library' && (
          <LibraryWorkspace
            collections={collections}
            watchlists={watchlists}
            notifications={notifications}
            repositories={repositories}
            onSelectRepository={(repo) => setSelectedRepository(repo)}
            userStack={preferences.targetStack}
          />
        )}

        {/* 5. Developer Platform & MCP */}
        {currentView === 'platform' && (
          <DeveloperPlatform
            apiKeys={apiKeys}
            repositories={repositories}
            onSelectRepository={(repo) => setSelectedRepository(repo)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        currentView={currentView}
        onNavigate={(v) => {
          setCurrentView(v);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        compareCount={comparedRepoIds.length}
      />

      {/* Offline Status Indicator */}
      <OfflineIndicator />

      {/* Global Command Palette / Search Modal */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        repositories={repositories}
        userStack={preferences.targetStack}
        onSelectRepository={(repo) => setSelectedRepository(repo)}
        onNavigateToAtlasWithQuery={(query) => {
          handleSearchFromHome(query);
        }}
      />

      {/* Repository Detail Modal */}
      <RepositoryDetailModal
        repository={selectedRepository}
        onClose={() => setSelectedRepository(null)}
        userStack={preferences.targetStack}
        isCompared={Boolean(selectedRepository && comparedRepoIds.includes(selectedRepository.id))}
        onToggleCompare={handleToggleCompare}
        onSaveToCollection={(repo) => setSavingRepo(repo)}
        onSelectRepoById={(id) => {
          const found = repositories.find((r) => r.id.toLowerCase() === id.toLowerCase());
          if (found) setSelectedRepository(found);
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        preferences={preferences}
        onUpdatePreferences={(p) => storageService.setPreferences(p)}
      />

      {/* Quick Save to Collection Modal */}
      {savingRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm p-6 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl text-xs text-[var(--text-primary)]">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Save to Collection</h3>
            <p className="text-[11px] text-[var(--text-muted)] mb-4">
              Saving <span className="text-[var(--accent)] font-semibold">{savingRepo.name}</span>
            </p>

            <div className="space-y-2 mb-4">
              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => handleQuickSave(col.id)}
                  className="w-full p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] hover:bg-[var(--surface-raised)] text-left text-xs text-[var(--text-primary)] flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="font-medium">{col.name}</span>
                  <span className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
                    {col.items.length} items
                  </span>
                </button>
              ))}
            </div>

            {quickSaveFeedback && (
              <div className="p-2 mb-3 rounded bg-[var(--accent)]/10 text-[var(--accent)] text-center font-medium">
                {quickSaveFeedback}
              </div>
            )}

            <button
              onClick={() => {
                setSavingRepo(null);
                setQuickSaveFeedback(null);
              }}
              className="w-full py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-raised)] text-[var(--text-secondary)] rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
