import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'replex-compare';
export const MAX_COMPARE = 4;

interface CompareValue {
  items: string[];
  has: (fullName: string) => boolean;
  add: (fullName: string) => 'added' | 'exists' | 'full';
  toggle: (fullName: string) => 'added' | 'removed' | 'full';
  remove: (fullName: string) => void;
  clear: () => void;
}

const CompareContext = createContext<CompareValue | null>(null);
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function read(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    for (const s of parsed) if (typeof s === 'string' && !out.some((o) => same(o, s)) && out.length < MAX_COMPARE) out.push(s);
    return out;
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItemsState] = useState<string[]>(read);
  // The ref is the source of truth so rapid successive calls (and React's
  // StrictMode double effects) never act on a stale list.
  const ref = useRef(items);
  const setItems = useCallback((next: string[]) => {
    ref.current = next;
    setItemsState(next);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items]);

  const has = useCallback((n: string) => ref.current.some((i) => same(i, n)), []);

  const add = useCallback(
    (n: string): 'added' | 'exists' | 'full' => {
      if (ref.current.some((i) => same(i, n))) return 'exists';
      if (ref.current.length >= MAX_COMPARE) return 'full';
      setItems([...ref.current, n]);
      return 'added';
    },
    [setItems],
  );

  const remove = useCallback((n: string) => setItems(ref.current.filter((i) => !same(i, n))), [setItems]);

  const toggle = useCallback(
    (n: string): 'added' | 'removed' | 'full' => {
      if (ref.current.some((i) => same(i, n))) {
        remove(n);
        return 'removed';
      }
      return add(n) === 'full' ? 'full' : 'added';
    },
    [add, remove],
  );

  const clear = useCallback(() => setItems([]), [setItems]);

  return <CompareContext.Provider value={{ items, has, add, toggle, remove, clear }}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used inside CompareProvider');
  return ctx;
}
