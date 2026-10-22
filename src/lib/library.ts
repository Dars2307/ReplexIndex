import type { Repository } from '../types/index.ts';
import { supabase } from './supabase.ts';

// Per-user data read and written directly through Supabase. Row-level
// security guarantees each query only ever sees the signed-in user's rows.

export interface CollectionSummary {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  updated_at: string;
  item_count: number;
}

export interface CollectionItem {
  repo_full_name: string;
  repo_snapshot: RepoSnapshot;
  notes: string;
  tags: string[];
  added_at: string;
}

export interface RepoSnapshot {
  fullName: string;
  description: string;
  url: string;
  stars: number;
  language: string;
  topics: string[];
  license: string | null;
  category?: string;
  agentReadiness?: number;
  pushedAt?: string;
}

export interface SearchRecord {
  id: string;
  query: string;
  filters: Record<string, unknown>;
  source: 'web' | 'mcp' | 'api';
  result_count: number | null;
  is_saved: boolean;
  name: string | null;
  created_at: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface AgentEvent {
  id: number;
  method: string;
  tool: string | null;
  ok: boolean;
  duration_ms: number | null;
  created_at: string;
  api_key_id: string | null;
}

function db() {
  if (!supabase) throw new Error('Accounts are not configured yet');
  return supabase;
}

async function userId(): Promise<string> {
  const { data } = await db().auth.getUser();
  if (!data.user) throw new Error('Sign in to continue');
  return data.user.id;
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export function snapshotOf(r: Repository): RepoSnapshot {
  return {
    fullName: r.fullName,
    description: r.description,
    url: r.htmlUrl,
    stars: r.stars,
    language: r.primaryLanguage,
    topics: r.topics.slice(0, 8),
    license: r.license?.spdxId ?? null,
    category: r.purpose?.technicalCategory,
    agentReadiness: r.agentReadiness?.score,
    pushedAt: r.pushedAt,
  };
}

// Collections -----------------------------------------------------------------
export async function listCollections(): Promise<CollectionSummary[]> {
  const rows = check(
    await db()
      .from('collections')
      .select('id, name, description, is_private, updated_at, collection_items(count)')
      .order('updated_at', { ascending: false }),
  ) as (Omit<CollectionSummary, 'item_count'> & { collection_items: { count: number }[] })[];
  return rows.map(({ collection_items, ...c }) => ({ ...c, item_count: collection_items?.[0]?.count ?? 0 }));
}

export async function createCollection(name: string, description = ''): Promise<CollectionSummary> {
  const row = check(
    await db()
      .from('collections')
      .insert({ user_id: await userId(), name: name.trim(), description: description.trim() })
      .select('id, name, description, is_private, updated_at')
      .single(),
  );
  return { ...(row as unknown as Omit<CollectionSummary, 'item_count'>), item_count: 0 };
}

export async function updateCollection(id: string, patch: { name?: string; description?: string }) {
  check(await db().from('collections').update(patch).eq('id', id));
}

export async function deleteCollection(id: string) {
  check(await db().from('collections').delete().eq('id', id));
}

export async function getCollection(id: string) {
  const collection = check(
    await db().from('collections').select('id, name, description, is_private, updated_at').eq('id', id).maybeSingle(),
  );
  if (!collection) return null;
  const items = check(
    await db()
      .from('collection_items')
      .select('repo_full_name, repo_snapshot, notes, tags, added_at')
      .eq('collection_id', id)
      .order('added_at', { ascending: false }),
  ) as CollectionItem[];
  return { ...(collection as unknown as Omit<CollectionSummary, 'item_count'>), items };
}

export async function addToCollection(collectionId: string, repo: Repository, notes = '') {
  check(
    await db()
      .from('collection_items')
      .upsert({ collection_id: collectionId, repo_full_name: repo.fullName, repo_snapshot: snapshotOf(repo), notes }, {
        onConflict: 'collection_id,repo_full_name',
      }),
  );
  await db().from('collections').update({ updated_at: new Date().toISOString() }).eq('id', collectionId);
}

export async function updateItemNotes(collectionId: string, fullName: string, notes: string) {
  check(await db().from('collection_items').update({ notes }).eq('collection_id', collectionId).eq('repo_full_name', fullName));
}

export async function removeFromCollection(collectionId: string, fullName: string) {
  check(await db().from('collection_items').delete().eq('collection_id', collectionId).eq('repo_full_name', fullName));
}

export async function collectionsContaining(fullName: string): Promise<string[]> {
  const rows = check(await db().from('collection_items').select('collection_id').eq('repo_full_name', fullName)) as {
    collection_id: string;
  }[];
  return rows.map((r) => r.collection_id);
}

// Searches --------------------------------------------------------------------
export async function listSearches(limit = 100): Promise<SearchRecord[]> {
  return check(
    await db()
      .from('searches')
      .select('id, query, filters, source, result_count, is_saved, name, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
  ) as SearchRecord[];
}

export async function setSearchSaved(id: string, saved: boolean, name?: string) {
  check(await db().from('searches').update({ is_saved: saved, name: name ?? null }).eq('id', id));
}

export async function deleteSearch(id: string) {
  check(await db().from('searches').delete().eq('id', id));
}

export async function clearSearchHistory() {
  check(await db().from('searches').delete().eq('is_saved', false).eq('user_id', await userId()));
}

// Keys and agent activity --------------------------------------------------------
export async function listKeys(): Promise<ApiKeyRecord[]> {
  return check(
    await db()
      .from('api_keys')
      .select('id, name, prefix, scopes, created_at, last_used_at, revoked_at')
      .order('created_at', { ascending: false }),
  ) as ApiKeyRecord[];
}

export async function listAgentEvents(limit = 50): Promise<AgentEvent[]> {
  return check(
    await db()
      .from('agent_events')
      .select('id, method, tool, ok, duration_ms, created_at, api_key_id')
      .order('created_at', { ascending: false })
      .limit(limit),
  ) as AgentEvent[];
}
