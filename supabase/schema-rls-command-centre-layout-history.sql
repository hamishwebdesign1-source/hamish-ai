-- Run this once in the Supabase SQL editor, after
-- schema-command-centre-layout-history.sql.
--
-- Same shape as campaigns_select_own_org — org_id directly on the row.
-- Writes (insert/delete) only ever happen through the admin client in
-- settings/actions.ts, same convention as every other Command Centre
-- write this session — no insert/delete policy needed for that path.

drop policy if exists "command_centre_layout_history_select_own_org" on command_centre_layout_history;
create policy "command_centre_layout_history_select_own_org"
  on command_centre_layout_history for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = command_centre_layout_history.org_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
