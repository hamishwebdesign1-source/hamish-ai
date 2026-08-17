-- Run this once in the Supabase SQL editor, after schema-organisations.sql
-- and schema-client-members.sql.
--
-- organisations_select_own (schema-organisations.sql) only matches via
-- memberships — "is this person on the org's own staff." A signed-in
-- /portal client is never org staff; they're a client_members row on one
-- of that org's clients. Without this, the portal layout's session-scoped
-- lookup of "which org owns my client, for branding" would silently
-- return nothing under RLS, even though the client legitimately should be
-- able to see their own client's org name/brand (not its billing plan or
-- anything else — just enough to render their portal branded correctly).
--
-- A SECURITY DEFINER function rather than a plain subquery in the policy,
-- same fix as schema-fix-client-members-recursion.sql used for a related
-- problem: the subquery here joins client_members and clients, and while
-- that specific join doesn't loop back into organisations itself, routing
-- it through a security-definer function keeps this policy's shape
-- consistent with the one other multi-table permission check in this
-- project rather than inlining a three-table join directly in USING.
-- search_path is pinned empty for the same reason as that function.

create or replace function public.my_client_org_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select c.org_id
  from public.client_members m
  join public.clients c on c.id = m.client_id
  where m.email = (select auth.jwt() ->> 'email')
    and c.org_id is not null
$$;

grant execute on function public.my_client_org_ids() to authenticated;

drop policy if exists "organisations_select_via_client" on organisations;
create policy "organisations_select_via_client"
  on organisations for select
  to authenticated
  using (id in (select public.my_client_org_ids()));
