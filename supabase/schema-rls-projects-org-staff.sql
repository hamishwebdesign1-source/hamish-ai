-- Run this once in the Supabase SQL editor, after schema-projects.sql and
-- schema-organisations.sql.
--
-- Same shape as clients_select_own_org — projects has org_id directly on
-- the row, so this is a straight membership match, no join through
-- clients needed. Only a SELECT policy: writes go through the
-- service-role client from Studio's own Server Actions (projects/actions.ts),
-- same convention as every other Studio-writable table in this app.

drop policy if exists "projects_select_own_org" on projects;
create policy "projects_select_own_org"
  on projects for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = projects.org_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
