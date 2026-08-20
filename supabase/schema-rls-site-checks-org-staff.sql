-- Run this once in the Supabase SQL editor for your project, after
-- schema-organisations.sql and schema-rls-clients-org-staff.sql.
--
-- Same shape as invoices_select_own_org / requests_select_own_org:
-- site_checks_select_own (schema-rls-portal.sql, schema-client-members.sql)
-- answers "which uptime checks can the client who owns the site see" — a
-- client_members email match. This answers a different question: "show
-- org staff every uptime check for one of their own organisation's
-- clients," needed for the Studio client health score (P1 platform
-- readiness item — site uptime is one of its real, non-fabricated
-- components, same four components portal-insights-data.ts already uses
-- client-side). Additive — the portal's own client-facing policy is
-- unaffected.

drop policy if exists "site_checks_select_own_org" on site_checks;
create policy "site_checks_select_own_org"
  on site_checks for select
  to authenticated
  using (
    exists (
      select 1 from clients c
      join memberships m on m.org_id = c.org_id
      where c.id = site_checks.client_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
