-- Run this once in the Supabase SQL editor for your project.
-- Phase 0 hardening: a durable, cross-instance rate limiter to replace the
-- in-memory Map in chat-rate-limit.ts, which only ever limited requests
-- landing on the same Vercel serverless instance — no real guarantee at all
-- once traffic spans more than one.
--
-- Deliberately built on Supabase Postgres rather than adding Upstash Redis
-- as a new third-party service: this project already has a service-role
-- Postgres connection everywhere it needs one, so this needs no new
-- account, no new env vars, and no new vendor to keep credentials for — for
-- this project's traffic (a handful of AI chat/contact requests a minute,
-- not thousands a second), Postgres's latency is nowhere near the limiting
-- factor. Revisit only if traffic volume ever makes that untrue.
--
-- The whole check is one atomic UPSERT executed inside Postgres, so
-- concurrent requests hitting the same key can't race each other into both
-- reading a stale count -- the guarantee an in-memory Map never had once
-- more than one server instance existed.

create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 1
);

create or replace function check_rate_limit(p_key text, p_window_seconds integer, p_max_requests integer)
returns boolean
language plpgsql
as $$
declare
  v_count integer;
begin
  insert into rate_limits (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set
      count = case
        when rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval then 1
        else rate_limits.count + 1
      end,
      window_start = case
        when rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval then now()
        else rate_limits.window_start
      end
  returning count into v_count;

  return v_count <= p_max_requests;
end;
$$;

-- Occasional cleanup so this table doesn't grow forever — call this from
-- the existing weekly-digest cron (or any cron) rather than adding a new
-- scheduled job just for this.
create or replace function cleanup_rate_limits()
returns void
language sql
as $$
  delete from rate_limits where window_start < now() - interval '1 day';
$$;

-- RLS stays enabled with zero policies (the project-wide default for
-- internal-only tables) — this table is only ever touched via the
-- service-role client (getSupabaseAdmin()), same as every other
-- internal/admin table, never via a session-scoped client.
alter table rate_limits enable row level security;
