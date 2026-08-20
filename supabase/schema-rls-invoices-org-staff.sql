-- Run this once in the Supabase SQL editor for your project, after
-- schema-organisations.sql and schema-rls-clients-org-staff.sql.
--
-- Same shape as clients_select_own_org / requests_select_own_org:
-- invoices_select_own (schema-rls-portal.sql) answers "which invoices can
-- the client who owes them see" — a client_members email match. This
-- answers a different question: "show org staff every invoice for one of
-- their own organisation's clients," needed for /studio's new client
-- billing UI. Additive — the portal's own client-facing policy is
-- unaffected.

drop policy if exists "invoices_select_own_org" on invoices;
create policy "invoices_select_own_org"
  on invoices for select
  to authenticated
  using (
    exists (
      select 1 from clients c
      join memberships m on m.org_id = c.org_id
      where c.id = invoices.client_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
