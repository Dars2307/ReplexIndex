const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const full = new Intl.NumberFormat();
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const formatCount = (n: number) => (n < 1000 ? full.format(n) : compact.format(n));
export const formatNumber = (n: number) => full.format(n);
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const seconds = (Date.parse(iso) - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(seconds) >= secs) return relative.format(Math.round(seconds / secs), unit);
  }
  return 'just now';
}

// GitHub linguist colours for the languages people search most.
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5', Rust: '#dea584', Go: '#00ADD8',
  Java: '#b07219', Kotlin: '#A97BFF', Swift: '#F05138', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
  Ruby: '#701516', PHP: '#4F5D95', Dart: '#00B4AB', Shell: '#89e051', Lua: '#000080', Zig: '#ec915c',
  Elixir: '#6e4a7e', Haskell: '#5e5086', Scala: '#c22d40', Vue: '#41b883', Svelte: '#ff3e00', HTML: '#e34c26',
  CSS: '#663399', 'Jupyter Notebook': '#DA5B0B', Nix: '#7e7eff', Assembly: '#6E4C13', MDX: '#fcb32c',
};
export const languageColor = (lang?: string | null) => (lang && LANGUAGE_COLORS[lang]) || 'var(--fg-subtle)';

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const modKey = isMac ? '⌘' : 'Ctrl';
