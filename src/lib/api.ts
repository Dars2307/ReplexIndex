import { supabase } from './supabase.ts';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch {
    throw new ApiError(0, 'You appear to be offline. Check your connection and try again.', 'offline');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error || `Request failed (${res.status})`, body.code);
  return body as T;
}

export const post = <T>(path: string, data: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(data) });
export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' });
