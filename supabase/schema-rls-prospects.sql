-- Run this once in the Supabase SQL editor for your project, after
-- schema-organisations.sql and schema-backfill-internal-org.sql.
-- Week 2 of the Agency Platform build.
--
-- Correction to the plan as originally written: "extend RLS with an org
-- join" doesn't mean touching clients/requests/tasks/invoices/site_checks/
-- knowledge_base. Those are already fully isolated by client_members — a
-- person maps to exactly one client_id, which belongs to exactly one
-- org_id, so there's no leak possible there without org_id ever being
-- checked. Adding a memberships-based org check to those policies would
-- actually be wrong: a real client of yours is not a member of your
-- organisation (memberships), they're a client of an organisation's
-- client (client_members) — a different relationship. Conflating the two
-- would be a bug dressed up as defense-in-depth, so those policies are
-- deliberately left untouched by this file.
--
-- prospects is the table that actually needed this. It's organisation-
-- scoped, not client-scoped, and today has zero read policies for anyone
-- but the service-role client (see schema-leads.sql's own comment: "no
-- public policies are created"). That was correct while prospects only
-- ever meant "Hamish's own prospecting pipeline." Now that every prospects
-- row carries an org_id (defaulted to HamishAI's own by
-- schema-backfill-internal-org.sql), a signed-in member of an
-- organisation should be able to see that organisation's own prospects —
-- the read path a future /studio workspace needs for a paying tenant.
--
-- SELECT-only, same convention as every other table here: writes
-- (updating status, adding notes, generating research) continue to go
-- through the service-role client from /admin/leads today, and will do
-- the same from /studio's own Server Actions later.
--
-- No self-join, so this doesn't hit the recursion bug documented in
-- schema-fix-client-members-recursion.sql — the subquery below reads
-- memberships, not prospects, and memberships_select_own
-- (schema-organisations.sql) has no subquery back into memberships
-- itself, so there's nothing here for Postgres to recurse through.

drop policy if exists "prospects_select_own_org" on prospects;
create policy "prospects_select_own_org"
  on prospects for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = prospects.org_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
