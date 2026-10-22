import { ArrowRight, Bot, Clock, Columns3, Compass, CornerDownLeft, Library, Moon, Search, Settings, Sun, TrendingUp } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { DiscoverySearchResult } from '../types/index.ts';
import { api } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';
import { formatCount } from '../lib/format.ts';
import { listSearches, type SearchRecord } from '../lib/library.ts';
import { useQuery } from '../lib/query.ts';
import { useRouter } from '../lib/router.tsx';
import { useTheme } from '../lib/theme.tsx';
import { Dialog } from './Dialog.tsx';
import { repoPath } from './repo.tsx';
import { Avatar, cn, Kbd } from './ui.tsx';

interface Item {
  id: string;
  group: string;
  label: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  run: () => void;
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const { resolved, setPreference } = useTheme();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const term = useDebounced(q.trim(), 350);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
    }
  }, [open]);

  const live = useQuery<DiscoverySearchResult>(
    open && term.length >= 2 ? `palette:${term}` : null,
    () => api(`/api/v1/discover/search?q=${encodeURIComponent(term)}&perPage=6`),
    5 * 60_000,
  );
  const history = useQuery<SearchRecord[]>(open && user ? 'searches' : null, () => listSearches(50), 30_000);

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const text = q.trim();
    if (text) {
      out.push({
        id: 'search',
        group: 'Search',
        icon: <Search className="size-4" aria-hidden />,
        label: (
          <>
            Search GitHub for <span className="font-medium text-fg">“{text}”</span>
          </>
        ),
        hint: <CornerDownLeft className="size-3.5" aria-hidden />,
        run: () => go(`/search?q=${encodeURIComponent(text)}`),
      });
      if (/^[\w.-]+\/[\w.-]+$/.test(text)) {
        out.push({ id: 'open', group: 'Search', icon: <ArrowRight className="size-4" aria-hidden />, label: <>Open <span className="font-mono">{text}</span></>, run: () => go(repoPath(text)) });
      }
      for (const r of live.data?.items ?? []) {
        out.push({
          id: `repo:${r.fullName}`,
          group: 'Repositories',
          icon: <Avatar src={`${r.owner.avatarUrl}&s=40`} alt="" size={18} square />,
          label: <span translate="no">{r.fullName}</span>,
          hint: <span className="tabular">★ {formatCount(r.stars)}</span>,
          run: () => go(repoPath(r.fullName)),
        });
      }
    } else if (history.data?.length) {
      const seen = new Set<string>();
      for (const s of history.data) {
        if (seen.has(s.query) || seen.size >= 4) continue;
        seen.add(s.query);
        out.push({ id: `recent:${s.id}`, group: 'Recent searches', icon: <Clock className="size-4" aria-hidden />, label: s.query, run: () => go(`/search?q=${encodeURIComponent(s.query)}`) });
      }
    }

    const pages: [string, string, ReactNode, string][] = [
      ['discover', 'Discover', <Compass className="size-4" aria-hidden />, '/discover'],
      ['trending', 'Trending this week', <TrendingUp className="size-4" aria-hidden />, '/discover?window=week'],
      ['compare', 'Compare', <Columns3 className="size-4" aria-hidden />, '/compare'],
      ['library', 'Collections', <Library className="size-4" aria-hidden />, '/library'],
      ['history', 'Search history', <Clock className="size-4" aria-hidden />, '/history'],
      ['agents', 'Agents & MCP', <Bot className="size-4" aria-hidden />, '/agents'],
      ['settings', 'Settings', <Settings className="size-4" aria-hidden />, '/settings'],
    ];
    const lower = text.toLowerCase();
    for (const [id, label, icon, to] of pages) {
      if (!lower || label.toLowerCase().includes(lower)) out.push({ id: `page:${id}`, group: 'Go to', icon, label, run: () => go(to) });
    }
    if (!lower || 'theme dark light'.includes(lower)) {
      out.push({
        id: 'theme',
        group: 'Preferences',
        icon: resolved === 'dark' ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />,
        label: `Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`,
        run: () => {
          setPreference(resolved === 'dark' ? 'light' : 'dark');
          onClose();
        },
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, live.data, history.data, resolved]);

  useEffect(() => setActive(0), [items.length]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault();
      items[active].run();
    }
  };

  let lastGroup = '';
  return (
    <Dialog open={open} onClose={onClose} title="Command palette" bare position="top" size="lg">
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
        <input
          data-autofocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
          aria-label="Search repositories or jump to a page"
          placeholder="Search all of GitHub, or jump to…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
          className="h-13 min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-subtle"
        />
        {live.loading && term.length >= 2 && <span className="text-[12px] text-fg-subtle">Searching…</span>}
        <Kbd>Esc</Kbd>
      </div>
      <div ref={listRef} id={listId} role="listbox" aria-label="Results" className="max-h-[min(60vh,440px)] overflow-y-auto p-2 scrollbar-thin">
        {items.length === 0 && <p className="px-3 py-8 text-center text-fg-muted">No matches.</p>}
        {items.map((item, i) => {
          const header = item.group !== lastGroup ? item.group : null;
          lastGroup = item.group;
          return (
            <div key={item.id}>
              {header && <div className="px-2 pb-1 pt-2 text-[12px] font-medium text-fg-subtle">{header}</div>}
              <div
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === active}
                onPointerMove={() => setActive(i)}
                onClick={() => item.run()}
                className={cn(
                  'flex h-10 cursor-pointer items-center gap-3 rounded-md px-2.5 text-fg-muted pointer-coarse:h-12',
                  i === active && 'bg-muted text-fg',
                )}
              >
                <span className="grid size-5 place-items-center text-fg-subtle">{item.icon}</span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && <span className="text-[12px] text-fg-subtle">{item.hint}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="hidden items-center gap-4 border-t border-border px-4 py-2 text-[12px] text-fg-subtle sm:flex">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navigate
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd> open
        </span>
      </div>
    </Dialog>
  );
}
