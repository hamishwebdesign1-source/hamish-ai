-- Run this once in the Supabase SQL editor, after schema-data-sources.sql
-- and schema-organisations.sql.
--
-- Same shape as clients_select_own_org — data_sources has org_id
-- directly on the row, so this is a straight membership match.

drop policy if exists "data_sources_select_own_org" on data_sources;
create policy "data_sources_select_own_org"
  on data_sources for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = data_sources.org_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
