-- Run this once in the Supabase SQL editor, after schema-organisations.sql,
-- schema-projects-stage.sql, and schema-client-members.sql.
--
-- Projects Kanban Command Centre, Phase C1 (docs/ai-team/BACKLOG.md's
-- matching entry; docs/ai-team/DECISIONS.md's two matching 2026-09-03
-- entries) -- a real Deliverable entity: staff-submitted against a
-- project, visible to the client in their portal once the project's own
-- `stage` reaches client_review/completed. Deliberately thin, matching
-- lead_meetings' own established precedent of shipping only the current
-- phase's columns: no status/approval columns yet, since every row here
-- is implicitly "submitted, not yet decided" until C2 adds a real
-- decision mechanism as a second, additive migration onto this same
-- table (status/client_decision_at/client_decision_by/client_comment).
-- No file attachment either -- deferred to Phase B's project_files table
-- once it exists, rather than inventing a second storage pattern.

create table if not exists deliverables (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references organisations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  link_url text,        -- optional (staging link, doc, etc.) -- Server
                         -- Action-side only accepts a real https:// URL,
                         -- see createDeliverable()'s isSafeDeliverableLink.
  submitted_by text,     -- email, same loose-string convention as assigned_to
  submitted_at timestamptz not null default now()
);

create index if not exists deliverables_project_id_idx on deliverables (project_id);
create index if not exists deliverables_org_id_idx on deliverables (org_id);

alter table deliverables enable row level security;

-- Org-staff SELECT via memberships -- identical shape to
-- schema-rls-projects-org-staff.sql / schema-rls-knowledge-base-org-staff.sql.
-- Writes go through the service-role client from Studio's own Server
-- Actions (projects/actions.ts's createDeliverable/deleteDeliverable),
-- same convention as every other Studio-writable table in this app --
-- no separate INSERT/UPDATE/DELETE policy is needed for a session that
-- never writes as itself; the ownership check on those writes is the
-- inline .eq("org_id", orgId) each action already does before its write,
-- same discipline as every sibling action in this file (ARCHITECTURE.md's
-- "RLS vs the service-role client" section).
drop policy if exists "deliverables_select_own_org" on deliverables;
create policy "deliverables_select_own_org"
  on deliverables for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = deliverables.org_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );

-- Client-portal SELECT only, via a join through projects requiring both
-- the existing client_members ownership check (same shape as
-- schema-rls-projects-client-portal.sql's projects_select_own) AND
-- projects.stage in ('client_review', 'completed'). This stage gate is
-- the entire mechanism that makes "Internal Review"/"Client Review" real
-- (BACKLOG.md's C1 entry): while a project sits in
-- not_started/in_progress/internal_review, any deliverables on it stay
-- invisible to the client by construction -- no separate visibility flag
-- to remember to flip, no second state machine, just the project's own
-- existing stage. No write ability for the client session -- read only.
drop policy if exists "deliverables_select_own" on deliverables;
create policy "deliverables_select_own"
  on deliverables for select
  to authenticated
  using (
    exists (
      select 1 from projects p
      join client_members cm on cm.client_id = p.client_id
      where p.id = deliverables.project_id
        and cm.email = (select auth.jwt() ->> 'email')
        and p.stage in ('client_review', 'completed')
    )
  );
