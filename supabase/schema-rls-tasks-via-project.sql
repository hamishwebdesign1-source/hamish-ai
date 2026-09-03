-- Run this once in the Supabase SQL editor, after
-- schema-rls-requests-tasks-org-staff.sql and schema-projects-stage.sql.
--
-- Real, confirmed bug found live (3 Sep 2026, Projects Kanban Command
-- Centre Phase A): createProjectTask() (projects/actions.ts) creates a
-- task directly on a project with request_id: null — a genuinely new
-- way for a task to exist, introduced by this same phase. The existing
-- tasks_select_own_org policy (schema-rls-requests-tasks-org-staff.sql)
-- only grants SELECT via a join through requests (tasks.request_id ->
-- requests.client_id -> clients.org_id) — a task with request_id: null
-- can never satisfy that join, so every project-only task is invisible
-- to every session-scoped read (the detail page's own task list), even
-- though the write itself succeeds (createProjectTask uses the
-- service-role admin client, which bypasses RLS on the write). Verified
-- live: a task created via the "Add a task" control on
-- /studio/projects/[id] never appeared, even after a full page reload,
-- while the admin-client write itself reported no error.
--
-- Fix: an additional, additive permissive policy (same "Postgres ORs
-- multiple permissive policies" pattern the existing policy's own
-- comment documents) covering the other real way a task can now exist —
-- visible if its project belongs to the caller's own org, independent
-- of whether it also has a request_id. Does not touch or replace
-- tasks_select_own_org; a task with a real request_id stays covered by
-- that policy exactly as before.

drop policy if exists "tasks_select_own_org_via_project" on tasks;
create policy "tasks_select_own_org_via_project"
  on tasks for select
  to authenticated
  using (
    exists (
      select 1 from projects p
      join memberships m on m.org_id = p.org_id
      where p.id = tasks.project_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
