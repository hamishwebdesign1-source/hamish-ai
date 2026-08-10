-- Run this once in the Supabase SQL editor for your project.
-- URGENT — fixes a live bug, unrelated to the client portal redesign.
--
-- client_members_select_team (schema-portal-settings.sql) reads:
--
--   using (
--     exists (
--       select 1 from client_members m2
--       where m2.client_id = client_members.client_id
--         and m2.email = (select auth.jwt() ->> 'email')
--     )
--   )
--
-- This is a policy ON client_members whose own USING clause queries
-- client_members again (aliased m2) — Postgres has to apply RLS to that
-- inner query too, which requires evaluating the same policy again, which
-- queries client_members again... infinite recursion (Postgres error
-- 42P17). Confirmed live: every session-scoped read of client_members —
-- which portal-membership.ts's getPortalMembership() depends on for
-- every single portal page — currently fails with "infinite recursion
-- detected in policy for relation client_members". No client can sign
-- into the portal at all right now.
--
-- schema-client-members.sql's original client_members_select_own policy
-- didn't have this problem because it compared the row's OWN email column
-- directly (no subquery back into client_members). schema-portal-settings.sql
-- broadened that to "any member of the same client" for the Settings
-- page's team list, and that broadening is what introduced the self-join.
--
-- Fix: move the "which client_ids does this email belong to" lookup into
-- a SECURITY DEFINER function. A security definer function runs with the
-- privileges of the function's owner, not the calling user, so its
-- internal query bypasses RLS on client_members entirely — breaking the
-- recursion cycle. search_path is pinned explicitly (empty, fully
-- qualified names) per Postgres's own security guidance for
-- SECURITY DEFINER functions, so a malicious search_path on the calling
-- session can't redirect what "client_members" resolves to.

create or replace function public.my_client_member_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select client_id
  from public.client_members
  where email = (select auth.jwt() ->> 'email')
$$;

grant execute on function public.my_client_member_ids() to authenticated;

drop policy if exists "client_members_select_team" on client_members;
create policy "client_members_select_team"
  on client_members for select
  to authenticated
  using (client_id in (select public.my_client_member_ids()));
