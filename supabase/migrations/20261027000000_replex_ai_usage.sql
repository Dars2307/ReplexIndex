-- Replex: tamper-proof AI allowance. Touches only the "replex" schema.
--
-- The daily AI allowance used to be counted from the user's search history,
-- which users can delete (History page), so deleting AI searches reset it.
-- This meter lives in its own table that clients cannot read or write.

create table if not exists replex.ai_usage (
  user_id uuid not null,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);
alter table replex.ai_usage enable row level security;
revoke all on replex.ai_usage from anon, authenticated;
grant all on replex.ai_usage to service_role;

-- Takes one request from today's allowance (UTC). Returns the new count, or
-- null when the allowance is used up (nothing is taken). Atomic, so parallel
-- requests cannot overshoot the limit.
create or replace function replex.use_ai_allowance(p_user uuid, p_limit integer)
returns integer
language sql
set search_path = ''
as $$
  insert into replex.ai_usage as u (user_id, day, count)
  values (p_user, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set count = u.count + 1
    where u.count < p_limit
  returning u.count;
$$;
revoke all on function replex.use_ai_allowance(uuid, integer) from public, anon, authenticated;
grant execute on function replex.use_ai_allowance(uuid, integer) to service_role;

-- Housekeeping now also drops old allowance rows.
create or replace function replex.purge_expired()
returns void
language sql
set search_path = ''
as $$
  delete from replex.github_cache where expires_at < now() - interval '1 hour';
  delete from replex.api_key_usage where window_start < now() - interval '1 hour';
  delete from replex.ai_usage where day < (now() at time zone 'utc')::date - 2;
$$;
revoke all on function replex.purge_expired() from public, anon, authenticated;
grant execute on function replex.purge_expired() to service_role;
