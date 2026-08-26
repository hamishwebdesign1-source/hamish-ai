-- Run this once in the Supabase SQL editor, after
-- schema-studio-health-snapshots.sql.
--
-- Same shape as command_centre_layout_history_select_own_org — org_id
-- directly on the row, select-only for members of that org. Writes only
-- ever happen through the admin client in health-snapshot.ts's weekly
-- cron, same convention as every other Command Centre history table —
-- no insert policy needed for that path.

drop policy if exists "studio_health_snapshots_select_own_org" on studio_health_snapshots;
create policy "studio_health_snapshots_select_own_org"
  on studio_health_snapshots for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = studio_health_snapshots.org_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
