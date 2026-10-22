import { createContext, useCallback, useContext, useEffect, useMemo, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react';

interface Location {
  pathname: string;
  search: URLSearchParams;
}

interface RouterValue {
  location: Location;
  navigate: (to: string, options?: { replace?: boolean; keepScroll?: boolean }) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

function read(): Location {
  return { pathname: window.location.pathname, search: new URLSearchParams(window.location.search) };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location>(read);

  useEffect(() => {
    const onPop = () => setLocation(read());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback<RouterValue['navigate']>((to, options = {}) => {
    const target = new URL(to, window.location.origin);
    const current = window.location.pathname + window.location.search;
    if (target.pathname + target.search === current) return;
    window.history[options.replace ? 'replaceState' : 'pushState']({}, '', target.pathname + target.search + target.hash);
    setLocation(read());
    if (!options.keepScroll) window.scrollTo({ top: 0 });
  }, []);

  const value = useMemo(() => ({ location, navigate }), [location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside RouterProvider');
  return ctx;
}

/** Match "/repo/:owner/:name" style patterns. */
export function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = pathname.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; replace?: boolean };

export function Link({ to, replace, onClick, children, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || rest.target === '_blank') return;
    e.preventDefault();
    navigate(to, { replace });
  };
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  );
}

/** Update query params in place without adding history entries. */
export function useSearchParams(): [URLSearchParams, (next: Record<string, string | undefined | null>) => void] {
  const { location, navigate } = useRouter();
  const set = useCallback(
    (next: Record<string, string | undefined | null>) => {
      const params = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(next)) {
        if (v === undefined || v === null || v === '') params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      navigate(window.location.pathname + (qs ? `?${qs}` : ''), { replace: true, keepScroll: true });
    },
    [navigate],
  );
  return [location.search, set];
}
