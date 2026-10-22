import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { post } from './api.ts';
import { supabase } from './supabase.ts';

export interface Profile {
  id: string;
  github_login: string | null;
  display_name: string | null;
  avatar_url: string | null;
  target_stack: string;
  theme: 'system' | 'dark' | 'light';
  reduced_motion: boolean;
  created_at: string;
}

interface AuthValue {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  signInWithGitHub: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, 'display_name' | 'target_stack' | 'theme' | 'reduced_motion'>>) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabase);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      setProfile(data as Profile);
      return;
    }
    // First visit to Replex with this (shared) account: create the profile.
    try {
      const res = await post<{ profile: Profile }>('/api/v1/me/bootstrap', {});
      setProfile(res.profile);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
      if (data.session) void loadProfile(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (!next) {
        setProfile(null);
        return;
      }
      if (event === 'SIGNED_IN') {
        void loadProfile(next.user.id);
        // Supabase hands us the GitHub token only once, right after OAuth.
        // The server verifies it belongs to this user and stores it encrypted.
        if (next.provider_token) {
          void post('/api/v1/me/github-token', { providerToken: next.provider_token }).catch(() => {});
        }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signInWithGitHub = useCallback(async (next = '/discover') => {
    if (!supabase) throw new Error('Accounts are not configured yet');
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo, scopes: 'read:user' } });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setProfile(null);
  }, []);

  const updateProfile = useCallback<AuthValue['updateProfile']>(
    async (patch) => {
      if (!supabase || !session) return;
      setProfile((p) => (p ? { ...p, ...patch } : p));
      const { error } = await supabase.from('profiles').update(patch).eq('id', session.user.id);
      if (error) {
        void loadProfile(session.user.id);
        throw error;
      }
    },
    [session, loadProfile],
  );

  const value = useMemo<AuthValue>(
    () => ({ ready, session, user: session?.user ?? null, profile, signInWithGitHub, signOut, updateProfile }),
    [ready, session, profile, signInWithGitHub, signOut, updateProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function displayName(user: User | null, profile: Profile | null): string {
  return (
    profile?.display_name ||
    profile?.github_login ||
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.user_name as string) ||
    'Your account'
  );
}
