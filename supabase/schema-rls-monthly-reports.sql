-- Run this once in the Supabase SQL editor, after schema-monthly-reports.sql,
-- schema-organisations.sql, and schema-client-members.sql.
--
-- Two SELECT policies, same shape as every other dual-audience table in
-- this app (invoices, requests): org staff see every report for their own
-- clients (Studio), and a client's own portal users see their own client's
-- reports (client_members match, same as invoices_select_own).

drop policy if exists "monthly_reports_select_own_org" on monthly_reports;
create policy "monthly_reports_select_own_org"
  on monthly_reports for select
  to authenticated
  using (
    exists (
      select 1 from clients c
      join memberships m on m.org_id = c.org_id
      where c.id = monthly_reports.client_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );

drop policy if exists "monthly_reports_select_own" on monthly_reports;
create policy "monthly_reports_select_own"
  on monthly_reports for select
  to authenticated
  using (
    exists (
      select 1 from client_members cm
      where cm.client_id = monthly_reports.client_id
        and cm.email = (select auth.jwt() ->> 'email')
    )
  );
