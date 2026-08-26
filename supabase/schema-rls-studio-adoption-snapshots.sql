-- Run this once in the Supabase SQL editor, after
-- schema-studio-adoption-snapshots.sql.
--
-- Same shape as studio_health_snapshots_select_own_org — org_id
-- directly on the row, select-only for members of that org. Writes
-- only ever happen through the admin client in the weekly health-
-- snapshot cron — no insert policy needed for that path.

drop policy if exists "studio_adoption_snapshots_select_own_org" on studio_adoption_snapshots;
create policy "studio_adoption_snapshots_select_own_org"
  on studio_adoption_snapshots for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = studio_adoption_snapshots.org_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
