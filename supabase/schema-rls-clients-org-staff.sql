-- Run this once in the Supabase SQL editor, after schema-organisations.sql
-- and schema-client-members.sql.
--
-- clients_select_own (schema-client-members.sql) answers "which one client
-- row does this signed-in client themselves have access to" — a
-- client_members match. /studio/clients needs a different question
-- answered: "show org staff every client that belongs to their own
-- organisation." Different relationship (memberships, not
-- client_members), so a second SELECT policy, not a change to the first.
--
-- Postgres combines multiple permissive policies on the same table/command
-- with OR, so this is purely additive — HamishAI's own admin/portal
-- access (which goes through the service-role client regardless, bypassing
-- RLS entirely) is completely unaffected, and a portal client's own
-- clients_select_own access is unchanged.
--
-- No self-join (queries memberships, not clients), so this doesn't risk
-- the recursion bug documented in schema-fix-client-members-recursion.sql.

drop policy if exists "clients_select_own_org" on clients;
create policy "clients_select_own_org"
  on clients for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = clients.org_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
