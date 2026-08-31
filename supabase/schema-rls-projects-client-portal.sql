-- Run this once in the Supabase SQL editor, after schema-projects.sql,
-- schema-rls-projects-org-staff.sql, and schema-client-members.sql.
--
-- projects only ever had one SELECT policy (projects_select_own_org, org
-- staff via memberships) - there was no policy granting a client's own
-- portal session read access to their own project rows at all, meaning
-- a session-scoped query from portal-insights-data.ts would always
-- silently return zero rows regardless of any .eq("client_id", ...)
-- filter in the application code. Adds the missing second policy, same
-- shape as every other dual-audience table in this app (monthly_reports,
-- invoices, requests): org staff keep seeing every project for their own
-- clients; a client's own portal users can now see their own project rows
-- only (client_members match).

drop policy if exists "projects_select_own" on projects;
create policy "projects_select_own"
  on projects for select
  to authenticated
  using (
    exists (
      select 1 from client_members cm
      where cm.client_id = projects.client_id
        and cm.email = (select auth.jwt() ->> 'email')
    )
  );
