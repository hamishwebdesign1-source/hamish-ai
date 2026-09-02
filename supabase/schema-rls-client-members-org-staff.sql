-- Run this once in the Supabase SQL editor for your project.
-- Studio big-ticket ("client portal self-serve team management") — the
-- Team members card has existed in /admin (schema-client-members.sql,
-- inviteClientMember/removeClientMember, src/app/admin/actions.ts) since
-- Phase 1, but nothing let a *tenant* manage who has portal access to
-- their own client. This is the missing read policy: same shape as
-- clients_select_own_org (schema-rls-clients-org-staff.sql), a second,
-- purely additive SELECT policy answering "show org staff every
-- client_members row for a client that belongs to their own
-- organisation" — a different relationship (memberships, joined through
-- clients) from client_members_select_own/client_members_select_team's
-- own "which client_ids does this signed-in *client* belong to."
--
-- No self-join on client_members (queries clients and memberships
-- instead), so this does NOT hit the recursion bug
-- schema-fix-client-members-recursion.sql fixed — that bug came
-- specifically from a client_members policy querying client_members
-- again.
drop policy if exists "client_members_select_own_org" on client_members;
create policy "client_members_select_own_org"
  on client_members for select
  to authenticated
  using (
    exists (
      select 1 from clients c
      join memberships m on m.org_id = c.org_id
      where c.id = client_members.client_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
