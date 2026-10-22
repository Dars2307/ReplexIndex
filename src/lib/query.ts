import { useCallback, useEffect, useRef, useState } from 'react';

interface Entry {
  data?: unknown;
  error?: Error;
  at: number;
  promise?: Promise<unknown>;
}

const cache = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

function emit(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

export function invalidate(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      emit(key);
    }
  }
}

export function setQueryData<T>(key: string, updater: (prev: T | undefined) => T) {
  const entry = cache.get(key);
  cache.set(key, { ...entry, at: Date.now(), data: updater(entry?.data as T | undefined), error: undefined });
  emit(key);
}

interface QueryState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  refetch: () => void;
}

/**
 * Minimal stale-while-revalidate data hook. `key === null` disables the query.
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>, staleMs = 60_000): QueryState<T> {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [, force] = useState(0);

  const load = useCallback(
    (k: string, force_ = false) => {
      const entry = cache.get(k);
      if (entry?.promise) return;
      if (!force_ && entry && entry.data !== undefined && Date.now() - entry.at < staleMs) return;
      const promise = fetcherRef.current()
        .then((data) => cache.set(k, { data, at: Date.now() }))
        .catch((error: Error) => cache.set(k, { ...cache.get(k), error, at: Date.now(), promise: undefined }))
        .finally(() => {
          const e = cache.get(k);
          if (e) e.promise = undefined;
          emit(k);
        });
      cache.set(k, { ...entry, at: entry?.at ?? 0, promise });
      emit(k);
    },
    [staleMs],
  );

  useEffect(() => {
    if (!key) return;
    const fn = () => force((n) => n + 1);
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(fn);
    load(key);
    return () => {
      listeners.get(key)?.delete(fn);
    };
  }, [key, load]);

  const entry = key ? cache.get(key) : undefined;
  return {
    data: entry?.data as T | undefined,
    error: entry?.error,
    loading: Boolean(key && (entry?.promise || (!entry?.data && !entry?.error))),
    refetch: () => key && load(key, true),
  };
}
