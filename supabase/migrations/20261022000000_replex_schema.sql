-- Replex schema for the shared "My Repos" Supabase project.
--
-- The project hosts several personal apps, one Postgres schema each. Replex
-- owns "replex" only: it never touches "public" (ThreadLink) or other schemas,
-- and it adds no triggers to the shared auth.users table. Replex profiles are
-- created on first sign-in by the app (POST /api/v1/me/bootstrap).
--
-- Idempotent where practical; run once in the SQL editor.

create schema if not exists replex;

grant usage on schema replex to anon, authenticated, service_role;
alter default privileges in schema replex grant all on tables to service_role;
alter default privileges in schema replex grant all on sequences to service_role;
alter default privileges in schema replex grant execute on functions to service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function replex.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists replex.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  github_login text,
  display_name text check (char_length(display_name) <= 80),
  avatar_url text,
  target_stack text not null default 'Next.js + TypeScript + Tailwind' check (char_length(target_stack) <= 200),
  theme text not null default 'system' check (theme in ('system', 'dark', 'light')),
  reduced_motion boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists profiles_touch on replex.profiles;
create trigger profiles_touch before update on replex.profiles
  for each row execute function replex.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Searches (history + pinned)
-- ---------------------------------------------------------------------------
create table if not exists replex.searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null check (char_length(query) <= 500),
  filters jsonb not null default '{}'::jsonb,
  source text not null default 'web' check (source in ('web', 'mcp', 'api')),
  result_count integer,
  is_saved boolean not null default false,
  name text check (char_length(name) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists searches_user_created_idx on replex.searches (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Collections
-- ---------------------------------------------------------------------------
create table if not exists replex.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists collections_user_idx on replex.collections (user_id, updated_at desc);
drop trigger if exists collections_touch on replex.collections;
create trigger collections_touch before update on replex.collections
  for each row execute function replex.touch_updated_at();

create table if not exists replex.collection_items (
  collection_id uuid not null references replex.collections (id) on delete cascade,
  repo_full_name text not null check (repo_full_name ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'),
  repo_snapshot jsonb not null default '{}'::jsonb,
  notes text not null default '' check (char_length(notes) <= 2000),
  tags text[] not null default '{}',
  added_at timestamptz not null default now(),
  primary key (collection_id, repo_full_name)
);
create index if not exists collection_items_repo_idx on replex.collection_items (repo_full_name);

-- ---------------------------------------------------------------------------
-- Watchlists (reserved for release/star alerts)
-- ---------------------------------------------------------------------------
create table if not exists replex.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  target_type text not null check (target_type in ('repository', 'topic', 'language', 'query')),
  target_value text not null check (char_length(target_value) <= 300),
  created_at timestamptz not null default now(),
  last_checked_at timestamptz
);
create index if not exists watchlists_user_idx on replex.watchlists (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- API keys: SHA-256 hash only; minted by the server.
-- ---------------------------------------------------------------------------
create table if not exists replex.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default array['search:read', 'repositories:read', 'library:read', 'library:write', 'mcp:invoke'],
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists api_keys_user_idx on replex.api_keys (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Agent / API activity (server-written)
-- ---------------------------------------------------------------------------
create table if not exists replex.agent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  api_key_id uuid references replex.api_keys (id) on delete set null,
  method text not null,
  tool text,
  ok boolean not null,
  duration_ms integer,
  created_at timestamptz not null default now()
);
create index if not exists agent_events_user_idx on replex.agent_events (user_id, created_at desc);
create index if not exists agent_events_key_idx on replex.agent_events (api_key_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Server-only tables
-- ---------------------------------------------------------------------------
create table if not exists replex.user_github_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token_ciphertext text not null,
  updated_at timestamptz not null default now()
);

create table if not exists replex.github_cache (
  cache_key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists github_cache_expiry_idx on replex.github_cache (expires_at);

-- Public repository index, grown from every GitHub response.
create table if not exists replex.repos (
  full_name text primary key,
  description text not null default '',
  language text,
  topics_text text not null default '',
  stars integer not null default 0,
  pushed_at timestamptz,
  upstream_created_at timestamptz,
  data jsonb not null,
  indexed_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('english', full_name || ' ' || description || ' ' || topics_text)
  ) stored
);
create index if not exists repos_search_idx on replex.repos using gin (search);
create index if not exists repos_stars_idx on replex.repos (stars desc);

-- ---------------------------------------------------------------------------
-- Privileges: service_role does everything; clients get exactly what RLS and
-- the app need, column by column where it matters.
-- ---------------------------------------------------------------------------
grant all on all tables in schema replex to service_role;
grant all on all sequences in schema replex to service_role;
revoke all on all tables in schema replex from anon, authenticated;

grant select on replex.profiles to authenticated;
grant update (display_name, target_stack, theme, reduced_motion) on replex.profiles to authenticated;

grant select, insert, update, delete on replex.searches to authenticated;
grant select, insert, update, delete on replex.collections to authenticated;
grant select, insert, update, delete on replex.collection_items to authenticated;
grant select, insert, delete on replex.watchlists to authenticated;

grant select (id, user_id, name, prefix, scopes, created_at, last_used_at, revoked_at) on replex.api_keys to authenticated;
grant update (revoked_at) on replex.api_keys to authenticated;

grant select on replex.agent_events to authenticated;
grant select on replex.repos to anon, authenticated;
-- user_github_tokens and github_cache: no client grants at all.

-- ---------------------------------------------------------------------------
-- Row-level security (enabled on every table, including server-only ones)
-- ---------------------------------------------------------------------------
alter table replex.profiles enable row level security;
alter table replex.searches enable row level security;
alter table replex.collections enable row level security;
alter table replex.collection_items enable row level security;
alter table replex.watchlists enable row level security;
alter table replex.api_keys enable row level security;
alter table replex.agent_events enable row level security;
alter table replex.user_github_tokens enable row level security;
alter table replex.github_cache enable row level security;
alter table replex.repos enable row level security;

drop policy if exists "profiles: read own" on replex.profiles;
create policy "profiles: read own" on replex.profiles
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles: update own" on replex.profiles;
create policy "profiles: update own" on replex.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "searches: own" on replex.searches;
create policy "searches: own" on replex.searches
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "collections: own" on replex.collections;
create policy "collections: own" on replex.collections
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "collection_items: own" on replex.collection_items;
create policy "collection_items: own" on replex.collection_items
  for all to authenticated
  using (exists (select 1 from replex.collections c where c.id = collection_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from replex.collections c where c.id = collection_id and c.user_id = (select auth.uid())));

drop policy if exists "watchlists: own" on replex.watchlists;
create policy "watchlists: own" on replex.watchlists
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "api_keys: read own" on replex.api_keys;
create policy "api_keys: read own" on replex.api_keys
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "api_keys: revoke own" on replex.api_keys;
create policy "api_keys: revoke own" on replex.api_keys
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "agent_events: read own" on replex.agent_events;
create policy "agent_events: read own" on replex.agent_events
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "repos: public read" on replex.repos;
create policy "repos: public read" on replex.repos
  for select to anon, authenticated using (true);

-- Expose to the Data API: add "replex" under Project Settings → API →
-- Exposed schemas (keep the existing entries).
