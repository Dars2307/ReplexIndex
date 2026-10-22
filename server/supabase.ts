import { createClient } from '@supabase/supabase-js';
import { waitUntil } from '@vercel/functions';
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

/**
 * Run a best-effort write without blocking the response.
 * - Supabase query builders are lazy (they only send when awaited/.then()'d),
 *   so `void builder` would silently do nothing; Promise.resolve() runs it.
 * - waitUntil keeps a Vercel function alive until the write settles, so it
 *   isn't cut off after the response is sent. Outside Vercel it's a no-op.
 */
export function background(query: PromiseLike<{ error: { message: string } | null } | void>, label: string): void {
  const done = Promise.resolve(query).then(
    (res) => {
      if (res && res.error) console.error(`[replex] ${label} failed:`, res.error.message);
    },
    (err) => console.error(`[replex] ${label} failed:`, err),
  );
  waitUntil(done);
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
