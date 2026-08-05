-- Run this once in the Supabase SQL editor for your project.
-- Phase 2 part 4: portal settings page (org name, notification
-- preferences, read-only team list).

-- Notification preference lives directly on clients -- one flag today
-- (weekly digest), the natural place to add more later without a new
-- table.
alter table clients add column if not exists weekly_digest_enabled boolean not null default true;

-- Broaden client_members visibility: a signed-in member could previously
-- only see their OWN membership row (client_members_select_own, from
-- schema-client-members.sql) -- enough for portal auth, not enough to
-- show "who else has access" on a settings page. This replaces that
-- policy with the same idea one level up: visible if you're a member of
-- the same client, not just if the row is literally your own.
drop policy if exists "client_members_select_own" on client_members;
drop policy if exists "client_members_select_team" on client_members;
create policy "client_members_select_team"
  on client_members for select
  to authenticated
  using (
    exists (
      select 1 from client_members m2
      where m2.client_id = client_members.client_id
        and m2.email = (select auth.jwt() ->> 'email')
    )
  );

-- Unlike team management (deliberately admin-only, see schema-client-
-- members.sql), a client's own notification preference is genuinely
-- self-service -- so this is the one write this migration lets a
-- session-scoped client make directly. The column grant is what actually
-- keeps it narrow: RLS alone only controls which *rows* an update can
-- touch, not which *columns* -- without this grant, passing RLS would
-- still let a client attempt to update business_name, status, or
-- anything else on their own row. Postgres's column-level GRANT is what
-- stops that, independent of RLS.
grant update (weekly_digest_enabled) on clients to authenticated;

drop policy if exists "clients_update_own_notification_pref" on clients;
create policy "clients_update_own_notification_pref"
  on clients for update
  to authenticated
  using (
    exists (
      select 1 from client_members m
      where m.client_id = clients.id
        and m.email = (select auth.jwt() ->> 'email')
    )
  )
  with check (
    exists (
      select 1 from client_members m
      where m.client_id = clients.id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
