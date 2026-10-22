import { createClient } from '@supabase/supabase-js';
import { env, supabaseConfigured } from './env.ts';

// Service-role client: bypasses RLS, so every query through it must scope by
// the authenticated user id explicitly. Replex lives in the `replex` schema of
// the shared "My Repos" project.
function makeAdmin() {
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    db: { schema: 'replex' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let admin: ReturnType<typeof makeAdmin> | null = null;

export function getAdmin() {
  if (!supabaseConfigured) return null;
  if (!admin) admin = makeAdmin();
  return admin;
}

export function requireAdmin() {
  const client = getAdmin();
  if (!client) throw new HttpError(503, 'Accounts are not configured on this server yet.');
  return client;
}

export class HttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
