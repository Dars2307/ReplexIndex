import React, { useState } from 'react';
import {
  Bookmark,
  Bell,
  Plus,
  Trash2,
  Download,
  Lock,
  Globe,
  ExternalLink,
  Tag,
  Check,
  Eye,
  ShieldCheck,
  GitCommit,
  CheckCircle2,
} from 'lucide-react';
import type { ActivityNotification, Collection, Repository, Watchlist } from '../../types/index.ts';
import { storageService } from '../../services/storage.ts';

interface LibraryWorkspaceProps {
  collections: Collection[];
  watchlists: Watchlist[];
  notifications: ActivityNotification[];
  repositories: Repository[];
  onSelectRepository: (repo: Repository) => void;
  userStack: string;
}

export const LibraryWorkspace: React.FC<LibraryWorkspaceProps> = ({
  collections,
  watchlists,
  notifications,
  repositories,
  onSelectRepository,
  userStack,
}) => {
  const [activeTab, setActiveTab] = useState<'collections' | 'activity'>('collections');

  // Collections state
  const [selectedColId, setSelectedColId] = useState<string>(collections[0]?.id || '');
  const [isCreatingCol, setIsCreatingCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [newColPrivate, setNewColPrivate] = useState(false);

  // Watchlist state
  const [isAddingWatch, setIsAddingWatch] = useState(false);
  const [newWatchName, setNewWatchName] = useState('');
  const [newTargetType, setNewTargetType] = useState<Watchlist['targetType']>('repository');
  const [newTargetValue, setNewTargetValue] = useState('');

  const activeCollection = collections.find((c) => c.id === selectedColId) || collections[0];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Handle Escape key for modals
  React.useEffect(() => {
    if (!isCreatingCol && !isAddingWatch) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreatingCol(false);
        setIsAddingWatch(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreatingCol, isAddingWatch]);

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    const created = storageService.createCollection(newColName.trim(), newColDesc.trim(), newColPrivate);
    setSelectedColId(created.id);
    setNewColName('');
    setNewColDesc('');
    setIsCreatingCol(false);
  };

  const handleDeleteCollection = (id: string) => {
    if (confirm('Are you sure you want to delete this collection?')) {
      storageService.deleteCollection(id);
      if (selectedColId === id) {
        setSelectedColId(collections[0]?.id || '');
      }
    }
  };

  const handleRemoveItem = (repoId: string) => {
    if (activeCollection) {
      storageService.removeRepositoryFromCollection(activeCollection.id, repoId);
    }
  };

  const exportToJson = () => {
    if (!activeCollection) return;
    const blob = new Blob([JSON.stringify(activeCollection, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCollection.name.toLowerCase().replace(/\s+/g, '_')}_collection.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCsv = () => {
    if (!activeCollection) return;
    const header = 'Repository ID,Name,Added Date,Notes,Tags\n';
    const rows = activeCollection.items
      .map((item) => {
        const repo = repositories.find((r) => r.id === item.repositoryId);
        return `"${item.repositoryId}","${repo?.name || ''}","${item.addedAt}","${(item.notes || '').replace(/"/g, '""')}","${item.tags.join(';')}"`;
      })
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCollection.name.toLowerCase().replace(/\s+/g, '_')}_collection.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchName.trim() || !newTargetValue.trim()) return;
    storageService.createWatchlist(newWatchName.trim(), newTargetType, newTargetValue.trim());
    setNewWatchName('');
    setNewTargetValue('');
    setIsAddingWatch(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-[var(--text-primary)]">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">Library & Saved Stacks</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Manage architectural bundles, monitor upstream release activity, and export stacks for autonomous agents.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl text-xs self-start sm:self-auto shadow-xs">
          <button
            onClick={() => setActiveTab('collections')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'collections' ? 'bg-[var(--surface-2)] text-[var(--text-primary)] font-bold shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Collections ({collections.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'activity' ? 'bg-[var(--surface-2)] text-[var(--text-primary)] font-bold shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Watchlists & Updates</span>
            {unreadCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: COLLECTIONS */}
      {activeTab === 'collections' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              Organize tool stacks into reusable bundles for architecture documentation and agent workflows.
            </span>
            <button
              onClick={() => setIsCreatingCol(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-[#0B1018] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Collection</span>
            </button>
          </div>

          {/* Creation Modal */}
          {isCreatingCol && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
              onClick={() => setIsCreatingCol(false)}
            >
              <div
                className="w-full max-w-md p-6 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Create New Collection</h3>
                <form onSubmit={handleCreateCollection} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[var(--text-muted)] mb-1 font-medium">Collection Name</label>
                    <input
                      type="text"
                      required
                      value={newColName}
                      onChange={(e) => setNewColName(e.target.value)}
                      placeholder="e.g. Video Infrastructure, Design System Starter"
                      className="w-full h-10 px-3 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-muted)] mb-1 font-medium">Description</label>
                    <textarea
                      rows={3}
                      value={newColDesc}
                      onChange={(e) => setNewColDesc(e.target.value)}
                      placeholder="Purpose of this stack..."
                      className="w-full p-2.5 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent)]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="col-private"
                      checked={newColPrivate}
                      onChange={(e) => setNewColPrivate(e.target.checked)}
                      className="rounded border-[var(--border-subtle)] bg-[var(--canvas)] accent-[var(--accent)]"
                    />
                    <label htmlFor="col-private" className="text-[var(--text-secondary)]">
                      Private collection
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setIsCreatingCol(false)}
                      className="px-3.5 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold text-[#0B1018] bg-[var(--accent)] rounded-xl hover:bg-[var(--accent-hover)] cursor-pointer shadow-xs"
                    >
                      Create Collection
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Collections Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left sidebar list */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-2">
                Your Stacks ({collections.length})
              </span>
              {collections.map((col) => {
                const isSelected = activeCollection?.id === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => setSelectedColId(col.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--surface-2)] border-[var(--accent)]/50 text-[var(--text-primary)] shadow-xs'
                        : 'bg-[var(--surface-1)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs truncate">{col.name}</span>
                        {col.isPrivate ? (
                          <Lock className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                        ) : (
                          <Globe className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums block mt-0.5">
                        {col.items.length} {col.items.length === 1 ? 'repository' : 'repositories'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right main view */}
            <div className="lg:col-span-3 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-xs">
              {activeCollection ? (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)] mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">{activeCollection.name}</h2>
                        {activeCollection.isPrivate ? (
                          <span className="text-[10px] text-[var(--text-muted)] bg-[var(--canvas)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                            Private
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded border border-[var(--accent)]/30 font-medium">
                            Public
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{activeCollection.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={exportToJson}
                        className="px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Export stack as JSON manifest"
                      >
                        <Download className="w-3 h-3" />
                        <span>JSON</span>
                      </button>
                      <button
                        onClick={exportToCsv}
                        className="px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Export stack as CSV spreadsheet"
                      >
                        <Download className="w-3 h-3" />
                        <span>CSV</span>
                      </button>
                      {collections.length > 1 && (
                        <button
                          onClick={() => handleDeleteCollection(activeCollection.id)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-rose-400 rounded-lg hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                          title="Delete collection"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {activeCollection.items.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-muted)] text-xs">
                      This collection is empty. Save tools from the Search directory using the bookmark button on any tool card or modal.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeCollection.items.map((item) => {
                        const repo = repositories.find((r) => r.id === item.repositoryId);
                        if (!repo) return null;
                        return (
                          <div
                            key={item.repositoryId}
                            className="p-4 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => onSelectRepository(repo)}
                                  className="font-bold text-sm text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors truncate cursor-pointer"
                                >
                                  {repo.name}
                                </button>
                                <span className="text-[11px] text-[var(--text-muted)] font-mono truncate">
                                  /{repo.owner.login}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-1">{repo.description}</p>
                              {item.notes && (
                                <p className="mt-1 text-[11px] text-[var(--accent)] font-mono">
                                  Note: {item.notes}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                                Added {new Date(item.addedAt).toLocaleDateString()}
                              </span>
                              <button
                                onClick={() => handleRemoveItem(item.repositoryId)}
                                className="text-[var(--text-muted)] hover:text-rose-400 transition-colors p-1 cursor-pointer"
                                title="Remove from stack"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WATCHLISTS & ACTIVITY FEED */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              Real-time feed of upstream releases, breaking API changes, and intelligence revisions.
            </span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => storageService.markAllNotificationsRead()}
                  className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl transition-colors cursor-pointer"
                >
                  Mark All Read
                </button>
              )}
              <button
                onClick={() => setIsAddingWatch(true)}
                className="px-3.5 py-1.5 text-xs font-bold text-[#0B1018] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Watch Target</span>
              </button>
            </div>
          </div>

          {/* Add Watch Target Modal */}
          {isAddingWatch && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
              onClick={() => setIsAddingWatch(false)}
            >
              <div
                className="w-full max-w-md p-6 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Create Watchlist Subscription</h3>
                <form onSubmit={handleAddWatch} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[var(--text-muted)] mb-1 font-medium">Subscription Name</label>
                    <input
                      type="text"
                      required
                      value={newWatchName}
                      onChange={(e) => setNewWatchName(e.target.value)}
                      placeholder="e.g. Video AI Updates, Next.js Ecosystem"
                      className="w-full h-10 px-3 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-muted)] mb-1 font-medium">Target Type</label>
                    <select
                      value={newTargetType}
                      onChange={(e) => setNewTargetType(e.target.value as any)}
                      className="w-full h-10 px-3 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent)]"
                    >
                      <option value="repository">Single Repository</option>
                      <option value="category">Technical Category</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[var(--text-muted)] mb-1 font-medium">
                      Target Identifier ({newTargetType === 'repository' ? 'e.g. remotion-dev/remotion' : 'Category Name'})
                    </label>
                    <input
                      type="text"
                      required
                      value={newTargetValue}
                      onChange={(e) => setNewTargetValue(e.target.value)}
                      placeholder={newTargetType === 'repository' ? 'owner/repo' : 'e.g. Video & Multimedia'}
                      className="w-full h-10 px-3 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent)]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setIsAddingWatch(false)}
                      className="px-3.5 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold text-[#0B1018] bg-[var(--accent)] rounded-xl hover:bg-[var(--accent-hover)] cursor-pointer shadow-xs"
                    >
                      Save Watch Target
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Activity Feed List */}
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border transition-all text-xs flex items-start justify-between gap-4 shadow-xs ${
                  notif.isRead
                    ? 'bg-[var(--surface-1)] border-[var(--border-subtle)] opacity-85'
                    : 'bg-[var(--surface-2)] border-[var(--accent)]/40'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-[var(--surface-1)] text-[var(--accent)] shrink-0 border border-[var(--border-subtle)]">
                    <GitCommit className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-[var(--text-primary)]">{notif.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-[var(--surface-1)] text-[var(--accent)] border border-[var(--border-subtle)]">
                        {notif.type}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">{notif.content}</p>
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      {new Date(notif.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!notif.isRead && (
                  <button
                    onClick={() => storageService.markNotificationRead(notif.id)}
                    className="px-2.5 py-1 text-[11px] rounded bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0 cursor-pointer"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
