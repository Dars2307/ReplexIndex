import type { Repository } from '../src/types/index.ts';
import { HttpError, requireAdmin, getAdmin } from './supabase.ts';

// All functions use the service-role client, so each query is explicitly
// scoped to userId. Never accept a user id from request input.

export function summarizeRepository(r: Repository) {
  return {
    fullName: r.fullName,
    description: r.description,
    url: r.htmlUrl,
    stars: r.stars,
    forks: r.forks,
    language: r.primaryLanguage,
    topics: r.topics,
    license: r.license?.spdxId ?? null,
    category: r.purpose?.technicalCategory,
    agentReadiness: r.agentReadiness?.score,
    pushedAt: r.pushedAt,
    createdAt: r.createdAt,
    archived: r.isArchived,
  };
}

export async function recordSearch(
  userId: string,
  query: string,
  filters: Record<string, unknown>,
  source: 'web' | 'mcp' | 'api',
  resultCount: number,
): Promise<void> {
  const admin = getAdmin();
  if (!admin) return;
  await admin.from('searches').insert({ user_id: userId, query: query.slice(0, 500), filters, source, result_count: resultCount });
}

export async function recentSearches(userId: string, limit = 10) {
  const { data, error } = await requireAdmin()
    .from('searches')
    .select('query, filters, source, result_count, is_saved, name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));
  if (error) throw new HttpError(500, 'Could not load searches');
  return data;
}

export async function listCollections(userId: string) {
  const { data, error } = await requireAdmin()
    .from('collections')
    .select('id, name, description, is_private, updated_at, collection_items(count)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw new HttpError(500, 'Could not load collections');
  return (data || []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    private: c.is_private,
    updatedAt: c.updated_at,
    itemCount: (c.collection_items as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findCollection(userId: string, idOrName: string) {
  const admin = requireAdmin();
  const query = admin.from('collections').select('id, name, description, is_private').eq('user_id', userId);
  const { data } = UUID.test(idOrName)
    ? await query.eq('id', idOrName).maybeSingle()
    : await query.ilike('name', idOrName.replace(/[%_]/g, '\\$&')).limit(1).maybeSingle();
  return data;
}

export async function getCollection(userId: string, idOrName: string) {
  const collection = await findCollection(userId, idOrName);
  if (!collection) throw new HttpError(404, `No collection named "${idOrName}"`);
  const { data } = await requireAdmin()
    .from('collection_items')
    .select('repo_full_name, repo_snapshot, notes, tags, added_at')
    .eq('collection_id', collection.id)
    .order('added_at', { ascending: false });
  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    items: (data || []).map((i) => ({
      fullName: i.repo_full_name,
      notes: i.notes,
      tags: i.tags,
      addedAt: i.added_at,
      description: (i.repo_snapshot as Record<string, unknown>)?.description ?? '',
      stars: (i.repo_snapshot as Record<string, unknown>)?.stars ?? null,
    })),
  };
}

export async function saveToCollection(userId: string, collectionName: string, repo: Repository, notes = '') {
  const admin = requireAdmin();
  const name = collectionName.trim().slice(0, 120);
  if (!name) throw new HttpError(400, 'Collection name is required');
  let collection = await findCollection(userId, name);
  let created = false;
  if (!collection) {
    const { data, error } = await admin
      .from('collections')
      .insert({ user_id: userId, name, description: '', is_private: true })
      .select('id, name, description, is_private')
      .single();
    if (error) throw new HttpError(500, 'Could not create collection');
    collection = data;
    created = true;
  }
  const { error } = await admin.from('collection_items').upsert(
    {
      collection_id: collection.id,
      repo_full_name: repo.fullName,
      repo_snapshot: summarizeRepository(repo),
      notes: notes.slice(0, 2000),
    },
    { onConflict: 'collection_id,repo_full_name' },
  );
  if (error) throw new HttpError(500, 'Could not save repository');
  await admin.from('collections').update({ updated_at: new Date().toISOString() }).eq('id', collection.id);
  return { collection: collection.name, collectionId: collection.id, createdCollection: created, saved: repo.fullName };
}

export async function targetStackFor(userId: string): Promise<string> {
  const admin = getAdmin();
  if (!admin) return '';
  const { data } = await admin.from('profiles').select('target_stack').eq('id', userId).maybeSingle();
  return data?.target_stack || '';
}

export async function logAgentEvent(event: {
  userId: string;
  apiKeyId?: string;
  method: string;
  tool?: string;
  ok: boolean;
  durationMs: number;
}): Promise<void> {
  const admin = getAdmin();
  if (!admin) return;
  await admin.from('agent_events').insert({
    user_id: event.userId,
    api_key_id: event.apiKeyId ?? null,
    method: event.method,
    tool: event.tool ?? null,
    ok: event.ok,
    duration_ms: event.durationMs,
  });
}
