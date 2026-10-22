-- Replex hardening (security review follow-ups). Touches only the "replex" schema.

-- 1. Revocation is final: clients can no longer write api_keys at all. Revoking
--    goes through the server (DELETE /api/v1/me/keys/:id), which only ever sets
--    revoked_at, never clears it.
revoke update on replex.api_keys from authenticated;
drop policy if exists "api_keys: revoke own" on replex.api_keys;

-- 2. Atomic per-key request counter, one row per key per minute. Every API-key
--    request (REST and MCP) is counted, including bursts in parallel.
create table if not exists replex.api_key_usage (
  key_id uuid not null references replex.api_keys (id) on delete cascade,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key_id, window_start)
);
alter table replex.api_key_usage enable row level security;
revoke all on replex.api_key_usage from anon, authenticated;
grant all on replex.api_key_usage to service_role;

create or replace function replex.hit_api_key(p_key uuid)
returns integer
language sql
set search_path = ''
as $$
  insert into replex.api_key_usage as u (key_id, window_start, count)
  values (p_key, date_trunc('minute', now()), 1)
  on conflict (key_id, window_start) do update set count = u.count + 1
  returning u.count;
$$;
revoke all on function replex.hit_api_key(uuid) from public, anon, authenticated;
grant execute on function replex.hit_api_key(uuid) to service_role;

-- 3. Housekeeping for the shared database: drop expired cache entries and old
--    usage windows. Called opportunistically by the server.
create or replace function replex.purge_expired()
returns void
language sql
set search_path = ''
as $$
  delete from replex.github_cache where expires_at < now() - interval '1 hour';
  delete from replex.api_key_usage where window_start < now() - interval '1 hour';
$$;
revoke all on function replex.purge_expired() from public, anon, authenticated;
grant execute on function replex.purge_expired() to service_role;
