import { Bookmark, BookmarkCheck, Check, Columns3, GitFork, Plus, Star } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Repository } from '../types/index.ts';
import { useAuth } from '../lib/auth.tsx';
import { MAX_COMPARE, useCompare } from '../lib/compare.tsx';
import { formatCount, languageColor, timeAgo } from '../lib/format.ts';
import { addToCollection, collectionsContaining, createCollection, listCollections, type CollectionSummary } from '../lib/library.ts';
import { invalidate, useQuery } from '../lib/query.ts';
import { Link } from '../lib/router.tsx';
import { accountsEnabled } from '../lib/supabase.ts';
import { useToast } from '../lib/toast.tsx';
import { Dialog } from './Dialog.tsx';
import { Avatar, Badge, Button, cn, IconButton, Input, Skeleton } from './ui.tsx';

export const repoPath = (fullName: string) => `/repo/${fullName}`;

export function LanguageDot({ language }: { language?: string | null }) {
  if (!language || language === 'Unknown') return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-fg-muted">
      <span aria-hidden className="size-2.5 rounded-full ring-1 ring-black/10 ring-inset" style={{ background: languageColor(language) }} />
      {language}
    </span>
  );
}

export function Stars({ count, className }: { count: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 tabular text-fg-muted', className)} aria-label={`${count.toLocaleString()} stars`}>
      <Star className="size-3.5" aria-hidden />
      {formatCount(count)}
    </span>
  );
}

export function readinessTone(score: number): 'success' | 'warning' | 'neutral' {
  return score >= 75 ? 'success' : score >= 50 ? 'warning' : 'neutral';
}

export function ReadinessRing({ score, size = 36 }: { score: number; size?: number }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const tone = readinessTone(score);
  const stroke = tone === 'success' ? 'var(--success)' : tone === 'warning' ? 'var(--warning)' : 'var(--fg-subtle)';
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`Agent readiness ${score} out of 100`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted-strong)" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <span className="absolute font-mono text-[11px] font-medium tabular text-fg">{score}</span>
    </span>
  );
}

export function CompareToggle({ fullName, size = 'sm' }: { fullName: string; size?: 'sm' | 'md' }) {
  const { has, toggle } = useCompare();
  const toast = useToast();
  const active = has(fullName);
  return (
    <IconButton
      size={size}
      variant="ghost"
      label={active ? `Remove ${fullName} from compare` : `Add ${fullName} to compare`}
      aria-pressed={active}
      className={cn(active && 'soft-accent hover:soft-accent')}
      onClick={() => {
        const result = toggle(fullName);
        if (result === 'full') toast({ tone: 'error', title: `You can compare up to ${MAX_COMPARE} repositories`, description: 'Remove one from the compare tray first.' });
      }}
    >
      {active ? <Check className="size-4" aria-hidden /> : <Columns3 className="size-4" aria-hidden />}
    </IconButton>
  );
}

export function SaveButton({ repo, size = 'sm', withLabel = false }: { repo: Repository; size?: 'sm' | 'md'; withLabel?: boolean }) {
  const [open, setOpen] = useState(false);
  const { user, signInWithGitHub } = useAuth();
  const toast = useToast();

  const onClick = () => {
    if (!accountsEnabled) {
      toast({ tone: 'error', title: 'Accounts are not set up on this server yet' });
      return;
    }
    if (!user) {
      toast({
        tone: 'info',
        title: 'Sign in to save repositories',
        description: 'Collections sync to your account and your agents.',
        action: { label: 'Sign in', onClick: () => void signInWithGitHub(window.location.pathname + window.location.search) },
      });
      return;
    }
    setOpen(true);
  };

  return (
    <>
      {withLabel ? (
        <Button size={size} onClick={onClick} icon={<Bookmark className="size-4" aria-hidden />}>
          Save
        </Button>
      ) : (
        <IconButton size={size} label={`Save ${repo.fullName} to a collection`} onClick={onClick}>
          <Bookmark className="size-4" aria-hidden />
        </IconButton>
      )}
      {open && <SaveDialog repo={repo} onClose={() => setOpen(false)} />}
    </>
  );
}

function SaveDialog({ repo, onClose }: { repo: Repository; onClose: () => void }) {
  const toast = useToast();
  const collections = useQuery<CollectionSummary[]>('collections', listCollections, 5_000);
  const containing = useQuery<string[]>(`containing:${repo.fullName}`, () => collectionsContaining(repo.fullName), 0);
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState('');

  const save = async (id: string, label: string) => {
    setBusy(id);
    try {
      await addToCollection(id, repo);
      invalidate('collections');
      invalidate(`collection:${id}`);
      invalidate(`containing:${repo.fullName}`);
      toast({ tone: 'success', title: `Saved to ${label}`, description: repo.fullName });
      onClose();
    } catch (err) {
      toast({ tone: 'error', title: 'Could not save', description: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const createAndSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy('new');
    try {
      const col = await createCollection(name);
      await save(col.id, col.name);
    } catch (err) {
      toast({ tone: 'error', title: 'Could not create collection', description: (err as Error).message });
      setBusy(null);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Save to collection" description={<span translate="no">{repo.fullName}</span>} size="sm">
      <div className="grid gap-1">
        {collections.loading && !collections.data && [0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}
        {collections.data?.map((c) => {
          const saved = containing.data?.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              disabled={Boolean(busy) || saved}
              onClick={() => save(c.id, c.name)}
              className="flex h-10 items-center gap-3 rounded-md px-2.5 text-left hover:bg-muted disabled:opacity-100 disabled:hover:bg-transparent pointer-coarse:h-12"
            >
              {saved ? <BookmarkCheck className="size-4 text-success" aria-hidden /> : <Bookmark className="size-4 text-fg-subtle" aria-hidden />}
              <span className="min-w-0 flex-1 truncate font-medium text-fg">{c.name}</span>
              <span className="text-[12px] tabular text-fg-subtle">{saved ? 'Saved' : `${c.item_count} saved`}</span>
            </button>
          );
        })}
        {collections.data?.length === 0 && <p className="px-1 pb-2 text-fg-muted">No collections yet. Create your first one below.</p>}
      </div>
      <form onSubmit={createAndSave} className="mt-3 flex gap-2 border-t border-border pt-4">
        <label htmlFor="new-collection" className="sr-only">
          New collection name
        </label>
        <Input
          id="new-collection"
          data-autofocus={collections.data?.length === 0 ? true : undefined}
          placeholder="New collection, e.g. “Reverse engineering”"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          autoComplete="off"
        />
        <Button type="submit" variant="primary" loading={busy === 'new'} icon={<Plus className="size-4" aria-hidden />}>
          Create
        </Button>
      </form>
    </Dialog>
  );
}

export function RepoCard({ repo, rank }: { repo: Repository; rank?: number }) {
  const [owner, name] = repo.fullName.split('/');
  const readiness = repo.agentReadiness?.score ?? 0;
  return (
    <article className="group relative flex flex-col rounded-lg border border-border bg-surface p-4 shadow-sm surface-highlight transition-colors hover:border-border-strong">
      <div className="flex items-start gap-3">
        <Avatar src={`${repo.owner.avatarUrl}${repo.owner.avatarUrl.includes('?') ? '&' : '?'}s=64`} alt="" size={32} square />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] leading-5" translate="no">
            <Link to={repoPath(repo.fullName)} className="outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-ring">
              <span className="text-fg-muted">{owner}/</span>
              <span className="font-semibold text-fg">{name}</span>
            </Link>
          </h3>
          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-fg-subtle">
            {rank !== undefined && <span className="font-mono tabular">#{rank}</span>}
            {repo.purpose?.technicalCategory && repo.purpose.technicalCategory !== 'Other / Unclassified' && (
              <span className="truncate">{repo.purpose.technicalCategory}</span>
            )}
          </div>
        </div>
        <div className="relative z-10 -mr-1 -mt-1 flex items-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <CompareToggle fullName={repo.fullName} />
          <SaveButton repo={repo} />
        </div>
      </div>

      <p className="mt-3 line-clamp-2 min-h-10 text-fg-muted">{repo.description || 'No description provided.'}</p>

      {repo.topics.length > 0 && (
        <ul className="mt-3 flex h-5 flex-wrap gap-1 overflow-hidden" aria-label="Topics">
          {repo.topics.slice(0, 3).map((t) => (
            <li key={t}>
              <Badge>{t}</Badge>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center gap-4 pt-4 text-[13px]">
        <LanguageDot language={repo.primaryLanguage} />
        <Stars count={repo.stars} />
        <span className="hidden items-center gap-1 tabular text-fg-muted sm:inline-flex" aria-label={`${repo.forks} forks`}>
          <GitFork className="size-3.5" aria-hidden />
          {formatCount(repo.forks)}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span className="hidden text-fg-subtle lg:inline">{timeAgo(repo.pushedAt)}</span>
          <span title={`Agent readiness: ${readiness}/100`}>
            <Badge tone={readinessTone(readiness)} className="font-mono tabular">
              <span className="sr-only">Agent readiness </span>
              {readiness}
            </Badge>
          </span>
        </span>
      </div>
    </article>
  );
}

export function RepoGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading repositories">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface p-4">
          <div className="flex gap-3">
            <Skeleton className="size-8" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="mt-4 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-4/5" />
          <div className="mt-6 flex gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}
