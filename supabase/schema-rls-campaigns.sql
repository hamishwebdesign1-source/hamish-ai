-- Run this once in the Supabase SQL editor, after schema-campaigns.sql
-- and schema-organisations.sql.
--
-- Same shape as clients_select_own_org — campaigns has org_id directly
-- on the row.

drop policy if exists "campaigns_select_own_org" on campaigns;
create policy "campaigns_select_own_org"
  on campaigns for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = campaigns.org_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
