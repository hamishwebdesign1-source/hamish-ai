-- Run this once in the Supabase SQL editor, after
-- schema-website-projects.sql.
--
-- Same shape as campaigns_select_own_org — org_id directly on the row.
-- Writes only ever happen through the admin client in
-- website-builder/actions.ts, same convention as every other Command
-- Centre / Studio write this session.

drop policy if exists "website_projects_select_own_org" on website_projects;
create policy "website_projects_select_own_org"
  on website_projects for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = website_projects.org_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
