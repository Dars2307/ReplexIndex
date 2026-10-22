import { Bot, Clock, Globe, Pin, PinOff, Search, Terminal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Dialog } from '../components/Dialog.tsx';
import { RequireAuth } from '../components/RequireAuth.tsx';
import { Badge, Button, Card, EmptyState, ErrorState, IconButton, PageHeader, Segmented, Skeleton } from '../components/ui.tsx';
import { formatNumber } from '../lib/format.ts';
import { clearSearchHistory, deleteSearch, listSearches, setSearchSaved, type SearchRecord } from '../lib/library.ts';
import { invalidate, setQueryData, useQuery } from '../lib/query.ts';
import { Link } from '../lib/router.tsx';
import { useToast } from '../lib/toast.tsx';

const SOURCE: Record<SearchRecord['source'], { label: string; icon: typeof Globe }> = {
  web: { label: 'Web', icon: Globe },
  mcp: { label: 'Agent', icon: Bot },
  api: { label: 'API', icon: Terminal },
};

function searchHref(s: SearchRecord) {
  const params = new URLSearchParams({ q: s.query });
  const f = s.filters as Record<string, unknown>;
  if (typeof f.language === 'string') params.set('language', f.language);
  if (typeof f.topic === 'string') params.set('topic', f.topic);
  if (typeof f.sort === 'string' && f.sort !== 'best') params.set('sort', f.sort);
  return `/search?${params}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

export function HistoryPage() {
  return (
    <RequireAuth title="History" description="Every search you and your agents run, kept private to your account.">
      <HistoryList />
    </RequireAuth>
  );
}

function HistoryList() {
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | 'saved' | 'agents'>('all');
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { data, error, loading, refetch } = useQuery<SearchRecord[]>('searches', () => listSearches(200), 10_000);

  const rows = (data ?? []).filter((s) => (filter === 'saved' ? s.is_saved : filter === 'agents' ? s.source !== 'web' : true));
  const groups = new Map<string, SearchRecord[]>();
  for (const s of rows) {
    const label = dayLabel(s.created_at);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(s);
  }

  const togglePin = async (s: SearchRecord) => {
    setQueryData<SearchRecord[]>('searches', (prev) => (prev ?? []).map((x) => (x.id === s.id ? { ...x, is_saved: !s.is_saved } : x)));
    try {
      await setSearchSaved(s.id, !s.is_saved);
    } catch (err) {
      invalidate('searches');
      toast({ tone: 'error', title: 'Could not update', description: (err as Error).message });
    }
  };

  const remove = async (s: SearchRecord) => {
    setQueryData<SearchRecord[]>('searches', (prev) => (prev ?? []).filter((x) => x.id !== s.id));
    try {
      await deleteSearch(s.id);
    } catch (err) {
      invalidate('searches');
      toast({ tone: 'error', title: 'Could not delete', description: (err as Error).message });
    }
  };

  return (
    <>
      <PageHeader
        title="History"
        description="Every search you and your agents run, kept private to your account. Pin the ones you come back to."
        actions={
          <>
            <Segmented
              label="Filter history"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'saved', label: 'Pinned' },
                { value: 'agents', label: 'Agents' },
              ]}
            />
            <Button variant="ghost" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setConfirmClear(true)} disabled={!data?.some((s) => !s.is_saved)}>
              Clear
            </Button>
          </>
        }
      />
      {error && <ErrorState message={error.message} onRetry={refetch} />}
      {loading && !data && <Skeleton className="h-72" />}
      {data && rows.length === 0 && (
        <EmptyState
          icon={<Clock className="size-5" aria-hidden />}
          title={filter === 'saved' ? 'No pinned searches' : filter === 'agents' ? 'No agent searches yet' : 'No searches yet'}
          description={filter === 'agents' ? 'Connect an agent from Agents & MCP and its searches appear here.' : 'Searches you run while signed in are saved here.'}
          action={
            <Link to={filter === 'agents' ? '/agents' : '/search'} className="inline-flex h-8 items-center rounded-sm bg-primary px-3 text-sm font-medium text-primary-fg hover:opacity-90">
              {filter === 'agents' ? 'Connect an agent' : 'Start searching'}
            </Link>
          }
        />
      )}
      <div className="space-y-6">
        {[...groups.entries()].map(([label, items]) => (
          <section key={label} aria-label={label}>
            <h2 className="mb-2 text-[12px] font-medium text-fg-subtle">{label}</h2>
            <Card>
              <ul className="divide-y divide-border">
                {items.map((s) => {
                  const src = SOURCE[s.source];
                  return (
                    <li key={s.id} className="group flex items-center gap-3 px-4 py-2.5">
                      <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                      <Link to={searchHref(s)} className="min-w-0 flex-1 truncate font-medium text-fg hover:underline">
                        {s.name || s.query}
                      </Link>
                      <span className="hidden text-[12px] tabular text-fg-subtle sm:inline">
                        {s.result_count !== null ? `${formatNumber(s.result_count)} results` : ''}
                      </span>
                      <Badge tone={s.source === 'web' ? 'neutral' : 'accent'}>
                        <src.icon className="size-3" aria-hidden />
                        {src.label}
                      </Badge>
                      <time className="hidden w-14 text-right text-[12px] tabular text-fg-subtle md:inline" dateTime={s.created_at}>
                        {new Date(s.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </time>
                      <IconButton size="sm" label={s.is_saved ? `Unpin “${s.query}”` : `Pin “${s.query}”`} aria-pressed={s.is_saved} onClick={() => togglePin(s)}>
                        {s.is_saved ? <PinOff className="size-3.5 text-accent" aria-hidden /> : <Pin className="size-3.5" aria-hidden />}
                      </IconButton>
                      <IconButton size="sm" label={`Delete “${s.query}” from history`} onClick={() => remove(s)}>
                        <Trash2 className="size-3.5" aria-hidden />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        ))}
      </div>

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear search history?"
        description="Unpinned searches are deleted. Pinned searches are kept."
        size="sm"
        footer={
          <>
            <Button onClick={() => setConfirmClear(false)}>Cancel</Button>
            <Button
              variant="danger"
              loading={clearing}
              onClick={async () => {
                setClearing(true);
                try {
                  await clearSearchHistory();
                  invalidate('searches');
                  setConfirmClear(false);
                  toast({ tone: 'success', title: 'History cleared' });
                } catch (err) {
                  toast({ tone: 'error', title: 'Could not clear', description: (err as Error).message });
                } finally {
                  setClearing(false);
                }
              }}
            >
              Clear history
            </Button>
          </>
        }
      >
        <p className="text-fg-muted">This can’t be undone.</p>
      </Dialog>
    </>
  );
}
