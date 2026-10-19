import { ApiKey, Collection, Repository, Watchlist, ActivityNotification } from '../types/index.ts';
import { SEED_REPOSITORIES } from '../data/seedRepositories.ts';

const REPOS_STORAGE_KEY = 'replex_repositories_v1';
const COLLECTIONS_STORAGE_KEY = 'replex_collections_v1';
const WATCHLISTS_STORAGE_KEY = 'replex_watchlists_v1';
const NOTIFICATIONS_STORAGE_KEY = 'replex_notifications_v1';
const API_KEYS_STORAGE_KEY = 'replex_api_keys_v1';
const USER_PREFS_KEY = 'replex_user_prefs_v1';

export interface UserPreferences {
  theme: 'dark' | 'light';
  reducedMotion: boolean;
  targetStack: string; // e.g. "Next.js + TypeScript + Tailwind"
}

class StorageService {
  private repositories: Repository[] = [];
  private collections: Collection[] = [];
  private watchlists: Watchlist[] = [];
  private notifications: ActivityNotification[] = [];
  private apiKeys: ApiKey[] = [];
  private preferences: UserPreferences = {
    theme: 'dark',
    reducedMotion: false,
    targetStack: 'Next.js + TypeScript + Tailwind',
  };

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    // 1. Repositories
    try {
      const storedRepos = typeof localStorage !== 'undefined' ? localStorage.getItem(REPOS_STORAGE_KEY) : null;
      if (storedRepos) {
        const parsed = JSON.parse(storedRepos);
        // Merge seed with stored custom repos
        const map = new Map<string, Repository>();
        for (const r of SEED_REPOSITORIES) map.set(r.id.toLowerCase(), r);
        for (const r of parsed) map.set(r.id.toLowerCase(), r);
        this.repositories = Array.from(map.values());
      } else {
        this.repositories = [...SEED_REPOSITORIES];
      }
    } catch {
      this.repositories = [...SEED_REPOSITORIES];
    }

    // 2. Collections
    try {
      const storedCols = typeof localStorage !== 'undefined' ? localStorage.getItem(COLLECTIONS_STORAGE_KEY) : null;
      if (storedCols) {
        this.collections = JSON.parse(storedCols);
      } else {
        // Initial default collections
        this.collections = [
          {
            id: 'col-ui-inspiration',
            name: 'UI & Design Systems',
            description: 'Curated component libraries, primitives, and icon toolkits for production web applications.',
            isPrivate: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: [
              {
                repositoryId: 'shadcn-ui/ui',
                addedAt: new Date().toISOString(),
                notes: 'Primary design system foundation for SaaS app layouts.',
                tags: ['ui', 'tailwind', 'primitives'],
              },
              {
                repositoryId: 'lucide-icons/lucide',
                addedAt: new Date().toISOString(),
                notes: 'Standard vector icon suite with tree-shakeable react wrappers.',
                tags: ['icons', 'svg'],
              },
              {
                repositoryId: 'framer/motion',
                addedAt: new Date().toISOString(),
                notes: 'Spring physics and modal transitions.',
                tags: ['animation', 'physics'],
              },
            ],
          },
          {
            id: 'col-agent-tooling',
            name: 'Agent Infrastructure',
            description: 'SDKs, RAG pipelines, and model adapters for autonomous coding workflows.',
            isPrivate: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: [
              {
                repositoryId: 'vercel/ai',
                addedAt: new Date().toISOString(),
                notes: 'Structured tool calling and streaming React hooks.',
                tags: ['agent', 'sdk', 'streaming'],
              },
              {
                repositoryId: 'drizzle-team/drizzle-orm',
                addedAt: new Date().toISOString(),
                notes: 'SQL types that agents can query without ambiguity.',
                tags: ['database', 'orm', 'types'],
              },
            ],
          },
        ];
        this.saveCollections();
      }
    } catch {
      this.collections = [];
    }

    // 3. Watchlists
    try {
      const storedWatch = typeof localStorage !== 'undefined' ? localStorage.getItem(WATCHLISTS_STORAGE_KEY) : null;
      if (storedWatch) {
        this.watchlists = JSON.parse(storedWatch);
      } else {
        this.watchlists = [
          {
            id: 'watch-1',
            name: 'Video & Media Tooling',
            targetType: 'category',
            targetValue: 'Video & Multimedia',
            createdAt: new Date().toISOString(),
            lastCheckedAt: new Date().toISOString(),
            notificationsCount: 1,
          },
          {
            id: 'watch-2',
            name: 'Remotion Updates',
            targetType: 'repository',
            targetValue: 'remotion-dev/remotion',
            createdAt: new Date().toISOString(),
            lastCheckedAt: new Date().toISOString(),
            notificationsCount: 2,
          },
        ];
        this.saveWatchlists();
      }
    } catch {
      this.watchlists = [];
    }

    // 4. Notifications
    try {
      const storedNotifs = typeof localStorage !== 'undefined' ? localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) : null;
      if (storedNotifs) {
        this.notifications = JSON.parse(storedNotifs);
      } else {
        this.notifications = [
          {
            id: 'notif-1',
            watchlistId: 'watch-2',
            repositoryId: 'remotion-dev/remotion',
            repositoryName: 'remotion',
            type: 'version_release',
            title: 'New Release: Remotion v4.0.180',
            description: 'Added WebCodecs hardware accelerated rendering improvements and Next.js 15 canary compatibility.',
            timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
            isRead: false,
          },
          {
            id: 'notif-2',
            watchlistId: 'watch-1',
            repositoryId: 'ffmpegwasm/ffmpeg.wasm',
            repositoryName: 'ffmpeg.wasm',
            type: 'recent_push',
            title: 'Multithreading performance patch merged',
            description: 'Improved SharedArrayBuffer allocation on Chromium 124+.',
            timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
            isRead: false,
          },
          {
            id: 'notif-3',
            watchlistId: 'watch-2',
            repositoryId: 'shadcn-ui/ui',
            repositoryName: 'ui',
            type: 'star_milestone',
            title: 'Milestone: 84k Stars Reached',
            description: 'Repository crossed 84,000 GitHub stars within indexed coverage.',
            timestamp: new Date(Date.now() - 3600000 * 32).toISOString(),
            isRead: true,
          },
        ];
        this.saveNotifications();
      }
    } catch {
      this.notifications = [];
    }

    // 5. API Keys
    try {
      const storedKeys = typeof localStorage !== 'undefined' ? localStorage.getItem(API_KEYS_STORAGE_KEY) : null;
      if (storedKeys) {
        this.apiKeys = JSON.parse(storedKeys);
      } else {
        this.apiKeys = [
          {
            id: 'key_dev_live_8912',
            name: 'Local Agent Development',
            prefix: 'nex_live_8912',
            hashedSecret: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            rateLimitTier: 'developer',
            allowedScopes: ['search:read', 'repositories:read', 'compare:read', 'mcp:invoke'],
          },
        ];
        this.saveApiKeys();
      }
    } catch {
      this.apiKeys = [];
    }

    // 6. Preferences
    try {
      const storedPrefs = typeof localStorage !== 'undefined' ? localStorage.getItem(USER_PREFS_KEY) : null;
      if (storedPrefs) {
        this.preferences = { ...this.preferences, ...JSON.parse(storedPrefs) };
      }
    } catch {
      // keep defaults
    }
  }

  // Subscriptions
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  // Repository Operations
  public getRepositories(): Repository[] {
    return this.repositories;
  }

  public getRepository(id: string): Repository | undefined {
    const clean = id.toLowerCase();
    return this.repositories.find((r) => r.id.toLowerCase() === clean || r.name.toLowerCase() === clean);
  }

  public addOrUpdateRepository(repo: Repository): void {
    const cleanId = repo.id.toLowerCase();
    const index = this.repositories.findIndex((r) => r.id.toLowerCase() === cleanId);
    if (index >= 0) {
      this.repositories[index] = repo;
    } else {
      this.repositories.unshift(repo);
    }
    this.saveRepositories();
    this.notify();
  }

  private saveRepositories() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(REPOS_STORAGE_KEY, JSON.stringify(this.repositories));
      } catch (e) {
        console.warn('Failed to save repositories to localStorage', e);
      }
    }
  }

  // Collections Operations
  public getCollections(): Collection[] {
    return this.collections;
  }

  public getCollection(id: string): Collection | undefined {
    return this.collections.find((c) => c.id === id);
  }

  public createCollection(name: string, description: string, isPrivate = false): Collection {
    const newCol: Collection = {
      id: `col-${Date.now()}`,
      name,
      description,
      isPrivate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
    };
    this.collections.unshift(newCol);
    this.saveCollections();
    this.notify();
    return newCol;
  }

  public deleteCollection(id: string): void {
    this.collections = this.collections.filter((c) => c.id !== id);
    this.saveCollections();
    this.notify();
  }

  public addRepositoryToCollection(collectionId: string, repoId: string, notes = '', tags: string[] = []): boolean {
    const col = this.collections.find((c) => c.id === collectionId);
    if (!col) return false;
    const exists = col.items.some((i) => i.repositoryId.toLowerCase() === repoId.toLowerCase());
    if (exists) return false;

    col.items.unshift({
      repositoryId: repoId,
      addedAt: new Date().toISOString(),
      notes,
      tags,
    });
    col.updatedAt = new Date().toISOString();
    this.saveCollections();
    this.notify();
    return true;
  }

  public removeRepositoryFromCollection(collectionId: string, repoId: string): void {
    const col = this.collections.find((c) => c.id === collectionId);
    if (!col) return;
    col.items = col.items.filter((i) => i.repositoryId.toLowerCase() !== repoId.toLowerCase());
    col.updatedAt = new Date().toISOString();
    this.saveCollections();
    this.notify();
  }

  private saveCollections() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(this.collections));
      } catch (e) {
        console.warn('Failed to save collections to localStorage', e);
      }
    }
  }

  // Watchlist Operations
  public getWatchlists(): Watchlist[] {
    return this.watchlists;
  }

  public createWatchlist(name: string, targetType: Watchlist['targetType'], targetValue: string): Watchlist {
    const newWatch: Watchlist = {
      id: `watch-${Date.now()}`,
      name,
      targetType,
      targetValue,
      createdAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString(),
      notificationsCount: 0,
    };
    this.watchlists.unshift(newWatch);
    this.saveWatchlists();
    this.notify();
    return newWatch;
  }

  public deleteWatchlist(id: string): void {
    this.watchlists = this.watchlists.filter((w) => w.id !== id);
    this.saveWatchlists();
    this.notify();
  }

  private saveWatchlists() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WATCHLISTS_STORAGE_KEY, JSON.stringify(this.watchlists));
    }
  }

  // Notifications
  public getNotifications(): ActivityNotification[] {
    return this.notifications;
  }

  public markNotificationRead(id: string): void {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.saveNotifications();
      this.notify();
    }
  }

  public markAllNotificationsRead(): void {
    this.notifications.forEach((n) => (n.isRead = true));
    this.saveNotifications();
    this.notify();
  }

  private saveNotifications() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(this.notifications));
    }
  }

  // API Keys
  public getApiKeys(): ApiKey[] {
    return this.apiKeys;
  }

  public createApiKey(name: string, rateLimitTier: ApiKey['rateLimitTier'] = 'developer'): { apiKey: ApiKey; rawSecret: string } {
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const rawSecret = `nex_${rateLimitTier}_${randomSuffix}_${Date.now().toString(36)}`;
    const prefix = `nex_${rateLimitTier}_${randomSuffix.substring(0, 4)}`;

    const apiKey: ApiKey = {
      id: `key_${Date.now()}`,
      name,
      prefix,
      hashedSecret: `sha256_${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      rateLimitTier,
      allowedScopes: ['search:read', 'repositories:read', 'compare:read', 'mcp:invoke'],
    };

    this.apiKeys.unshift(apiKey);
    this.saveApiKeys();
    this.notify();

    return { apiKey, rawSecret };
  }

  public revokeApiKey(id: string): void {
    this.apiKeys = this.apiKeys.filter((k) => k.id !== id);
    this.saveApiKeys();
    this.notify();
  }

  private saveApiKeys() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(this.apiKeys));
    }
  }

  // Preferences
  public getPreferences(): UserPreferences {
    return this.preferences;
  }

  public setPreferences(prefs: Partial<UserPreferences>): void {
    this.preferences = { ...this.preferences, ...prefs };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(USER_PREFS_KEY, JSON.stringify(this.preferences));
    }
    // Update HTML root class for theme
    if (typeof document !== 'undefined') {
      if (this.preferences.theme === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      }
    }
    this.notify();
  }
}

export const storageService = new StorageService();
