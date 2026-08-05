-- Run this once in the Supabase SQL editor for your project.
-- Phase 4 part 1: an audit log. Same convention as every other internal
-- table -- RLS enabled, no public policies, written only via the
-- service-role client from admin actions, portal actions, and the cron/
-- webhook routes.
--
-- Only meaningful once Phase 1 (multi-user client organisations) existed
-- -- before that, "who did what" on the client side was always exactly
-- one person, so there was nothing to disambiguate. On the admin side
-- it's still always "admin" (a single shared password, no per-operator
-- identity yet -- see the standing note on a second-operator access
-- model) rather than a specific person's name; recording that honestly
-- as "admin" is better than fabricating an identity the system doesn't
-- actually track.

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor text not null,
  actor_type text not null default 'admin' check (actor_type in ('admin', 'client', 'system')),
  action text not null,
  target_type text,
  target_id text,
  client_id uuid references clients(id),
  metadata jsonb
);

alter table audit_log enable row level security;

create index if not exists audit_log_client_id_idx on audit_log (client_id);
create index if not exists audit_log_created_at_idx on audit_log (created_at desc);
