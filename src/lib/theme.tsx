import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './auth.tsx';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeValue {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);
const STORAGE_KEY = 'replex-theme';

function systemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile, updateProfile } = useAuth();
  const [preference, setPref] = useState<ThemePreference>(readStored);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  // Adopt the saved account preference once it loads.
  useEffect(() => {
    if (profile?.theme) setPref(profile.theme);
  }, [profile?.theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const isDark = preference === 'dark' || (preference === 'system' && systemDark());
      document.documentElement.classList.toggle('dark', isDark);
      setDark(isDark);
    };
    apply();
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      /* storage unavailable */
    }
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);

  const setPreference = useCallback(
    (p: ThemePreference) => {
      setPref(p);
      if (profile && profile.theme !== p) void updateProfile({ theme: p }).catch(() => {});
    },
    [profile, updateProfile],
  );

  return <ThemeContext.Provider value={{ preference, resolved: dark ? 'dark' : 'light', setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
