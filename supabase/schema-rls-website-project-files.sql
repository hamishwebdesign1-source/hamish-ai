-- Run this once in the Supabase SQL editor, after
-- schema-website-project-files.sql.
--
-- Same shape as website_projects_select_own_org — org_id directly on
-- the row. Writes only ever happen through the admin client in
-- website-builder/actions.ts, same convention as every other Command
-- Centre / Studio write this session.

drop policy if exists "website_project_files_select_own_org" on website_project_files;
create policy "website_project_files_select_own_org"
  on website_project_files for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = website_project_files.org_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
