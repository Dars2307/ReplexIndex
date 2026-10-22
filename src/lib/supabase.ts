import { createClient } from '@supabase/supabase-js';

const real = (v?: string) => (v && !/^(paste-|your-)|\.\.\.$/i.test(v) ? v : undefined);
const url = real(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const key = real((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined);

export const supabase =
  url && key
    ? createClient(url, key, {
        // Replex lives in its own schema inside the shared "My Repos" project.
        db: { schema: 'replex' },
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const accountsEnabled = Boolean(supabase);
