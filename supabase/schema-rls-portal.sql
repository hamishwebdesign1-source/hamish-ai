-- Run this once in the Supabase SQL editor for your project.
-- Phase 0 hardening: real Row Level Security on every table the client
-- portal reads. Every previous schema file enabled RLS but added no
-- policies, on the assumption that every query would always go through
-- the server-side service-role client (which bypasses RLS by design) —
-- meaning tenant isolation was enforced entirely by application code
-- remembering to filter by client_id, with nothing underneath catching a
-- mistake. This migration is the other half: the portal's read paths
-- (src/lib/portal-insights-data.ts, src/lib/answer-account-question.ts)
-- now run on a session-bound client carrying the signed-in user's own
-- Supabase Auth JWT, so Postgres itself refuses to return a row that
-- doesn't belong to them — independent of what the application code does.
--
-- SELECT-only. No INSERT/UPDATE/DELETE policies are added anywhere here,
-- which means (with RLS enabled and no write policy) the session client
-- cannot write to any of these tables at all — correct, since every write
-- path (triage, invoicing, admin actions, cron jobs) legitimately still
-- goes through the service-role client, which continues to bypass RLS
-- entirely regardless of the policies below.
--
-- Unlike "create table if not exists" elsewhere in this project, Postgres
-- has no "create policy if not exists" — each policy is dropped first (a
-- no-op the first time this runs) so the whole script stays safe to
-- re-run, matching the idempotent convention of every other schema file.

-- clients: a client can see their own row, matched by the email on their
-- Supabase Auth session — the same match already used in application code
-- everywhere a portal page looks up "which client is this."
drop policy if exists "clients_select_own" on clients;
create policy "clients_select_own"
  on clients for select
  to authenticated
  using (email = (select auth.jwt() ->> 'email'));

-- requests: visible if it belongs to a client whose email matches.
drop policy if exists "requests_select_own" on requests;
create policy "requests_select_own"
  on requests for select
  to authenticated
  using (
    exists (
      select 1 from clients c
      where c.id = requests.client_id
        and c.email = (select auth.jwt() ->> 'email')
    )
  );

-- tasks: one join further — visible if the task's request belongs to a
-- client whose email matches. A task with no request_id (pure internal
-- admin work) is correctly invisible to every client.
drop policy if exists "tasks_select_own" on tasks;
create policy "tasks_select_own"
  on tasks for select
  to authenticated
  using (
    exists (
      select 1 from requests r
      join clients c on c.id = r.client_id
      where r.id = tasks.request_id
        and c.email = (select auth.jwt() ->> 'email')
    )
  );

-- invoices: same direct client_id pattern as requests.
drop policy if exists "invoices_select_own" on invoices;
create policy "invoices_select_own"
  on invoices for select
  to authenticated
  using (
    exists (
      select 1 from clients c
      where c.id = invoices.client_id
        and c.email = (select auth.jwt() ->> 'email')
    )
  );

-- site_checks: same direct client_id pattern.
drop policy if exists "site_checks_select_own" on site_checks;
create policy "site_checks_select_own"
  on site_checks for select
  to authenticated
  using (
    exists (
      select 1 from clients c
      where c.id = site_checks.client_id
        and c.email = (select auth.jwt() ->> 'email')
    )
  );

-- knowledge_base: general entries (client_id is null) are visible to any
-- signed-in client; scoped entries only to the client they belong to.
drop policy if exists "knowledge_base_select_own_or_general" on knowledge_base;
create policy "knowledge_base_select_own_or_general"
  on knowledge_base for select
  to authenticated
  using (
    client_id is null
    or exists (
      select 1 from clients c
      where c.id = knowledge_base.client_id
        and c.email = (select auth.jwt() ->> 'email')
    )
  );
