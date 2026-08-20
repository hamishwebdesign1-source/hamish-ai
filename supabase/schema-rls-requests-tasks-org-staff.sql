-- Run this once in the Supabase SQL editor for your project, after
-- schema-organisations.sql and schema-rls-clients-org-staff.sql.
--
-- Same shape as clients_select_own_org (schema-rls-clients-org-staff.sql):
-- requests_select_own (schema-rls-portal.sql) answers "which requests can
-- the client who submitted them see" — a client_members email match.
-- This answers a different question: "show org staff every request that
-- belongs to one of their own organisation's clients." Additive (Postgres
-- OR's multiple permissive policies on the same table/command), so the
-- portal's own client-facing access is completely unaffected.
--
-- tasks follows one join further, same as tasks_select_own already does
-- for the client-facing side: visible if its request's client belongs to
-- the caller's own org.

drop policy if exists "requests_select_own_org" on requests;
create policy "requests_select_own_org"
  on requests for select
  to authenticated
  using (
    exists (
      select 1 from clients c
      join memberships m on m.org_id = c.org_id
      where c.id = requests.client_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );

drop policy if exists "tasks_select_own_org" on tasks;
create policy "tasks_select_own_org"
  on tasks for select
  to authenticated
  using (
    exists (
      select 1 from requests r
      join clients c on c.id = r.client_id
      join memberships m on m.org_id = c.org_id
      where r.id = tasks.request_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
