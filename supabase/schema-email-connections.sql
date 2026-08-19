-- Run this once in the Supabase SQL editor for your project.
-- Phase 1 of docs/inbox-reply-detection-plan.md (see the published scoping
-- artifact for the full plan): one connected inbox per organisation, used
-- read-only to detect when a prospect has replied.
--
-- Deliberately its own table, not a reuse of ms_graph_tokens — that table
-- is a single hardcoded row for HamishAI's own internal Microsoft account
-- (Calendars.ReadWrite, Teams scopes). This is multi-tenant: one row per
-- paying org, a different Azure app registration (Mail.Read only, no
-- write scopes), and its own refresh-token rotation to persist.

create table if not exists email_connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  provider text not null default 'microsoft' check (provider in ('microsoft')),
  email_address text not null,
  refresh_token text not null,
  connected_at timestamptz not null default now(),
  last_checked_at timestamptz,
  -- One connected inbox per org today — reconnecting overwrites the
  -- existing row (upserted on org_id+provider) rather than accumulating
  -- stale connections.
  unique (org_id, provider)
);

alter table email_connections enable row level security;

-- SELECT-only, same convention as every other org-scoped table in this
-- app: connecting, disconnecting and the reply-check itself all go
-- through Server Actions using the service-role client, which bypasses
-- RLS by design. This policy only lets a signed-in member see their own
-- org's connection status (e.g. "connected as you@business.com") on the
-- settings page.
drop policy if exists "email_connections_select_own_org" on email_connections;
create policy "email_connections_select_own_org"
  on email_connections for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = email_connections.org_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );

create index if not exists email_connections_org_id_idx on email_connections (org_id);
