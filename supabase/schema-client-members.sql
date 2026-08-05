-- Run this once in the Supabase SQL editor for your project.
-- Phase 1: multi-user client organisations. Until now the portal matched a
-- signed-in session to a client by exact string equality against a single
-- clients.email column — one login identity per business, hard-coded. This
-- adds a proper membership table so more than one person at a client can
-- have their own portal login, without renaming or restructuring the
-- clients table itself (it already is the tenant/organisation boundary —
-- every other table already keys off client_id — so there is no need to
-- introduce a separate "organisations" concept and migrate everything onto
-- it, only to add who's allowed in).
--
-- clients.email is left in place deliberately, as the primary/display
-- contact address (shown in the admin UI, used for billing correspondence)
-- — it is no longer what portal access is decided by.
--
-- Backward compatible in one direction only: every existing client's
-- current sign-in email is backfilled below as an 'owner' member, so
-- nothing breaks for anyone who could already sign in. New logic (this
-- file's RLS policies) is additive; the application code catch-up that
-- actually uses client_members lands in a follow-up commit.

create table if not exists client_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  invited_at timestamptz not null default now(),
  invited_by text,
  accepted_at timestamptz,
  unique (client_id, email)
);

-- One owner row per existing client with an email on file, so today's
-- sign-in flow keeps working unchanged the moment this migration runs.
-- accepted_at is backfilled to now() since these people already have
-- working portal access today, not a pending invite.
insert into client_members (client_id, email, role, invited_by, accepted_at)
select id, email, 'owner', 'system-backfill', now()
from clients
where email is not null and email <> ''
on conflict (client_id, email) do nothing;

alter table client_members enable row level security;

drop policy if exists "client_members_select_own" on client_members;
create policy "client_members_select_own"
  on client_members for select
  to authenticated
  using (email = (select auth.jwt() ->> 'email'));

-- The six policies below are the same shape as schema-rls-portal.sql, with
-- the "clients c where c.email = ..." join replaced by a client_members
-- membership check — the only thing that actually changes is *how* a
-- session is matched to a client_id, not what each table exposes.

drop policy if exists "clients_select_own" on clients;
create policy "clients_select_own"
  on clients for select
  to authenticated
  using (
    exists (
      select 1 from client_members m
      where m.client_id = clients.id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );

drop policy if exists "requests_select_own" on requests;
create policy "requests_select_own"
  on requests for select
  to authenticated
  using (
    exists (
      select 1 from client_members m
      where m.client_id = requests.client_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );

drop policy if exists "tasks_select_own" on tasks;
create policy "tasks_select_own"
  on tasks for select
  to authenticated
  using (
    exists (
      select 1 from requests r
      join client_members m on m.client_id = r.client_id
      where r.id = tasks.request_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );

drop policy if exists "invoices_select_own" on invoices;
create policy "invoices_select_own"
  on invoices for select
  to authenticated
  using (
    exists (
      select 1 from client_members m
      where m.client_id = invoices.client_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );

drop policy if exists "site_checks_select_own" on site_checks;
create policy "site_checks_select_own"
  on site_checks for select
  to authenticated
  using (
    exists (
      select 1 from client_members m
      where m.client_id = site_checks.client_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );

drop policy if exists "knowledge_base_select_own_or_general" on knowledge_base;
create policy "knowledge_base_select_own_or_general"
  on knowledge_base for select
  to authenticated
  using (
    client_id is null
    or exists (
      select 1 from client_members m
      where m.client_id = knowledge_base.client_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
