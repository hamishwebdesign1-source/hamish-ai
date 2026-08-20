-- Run this once in the Supabase SQL editor for your project.
-- P1 platform readiness item — lightweight project tracking. Deliberately
-- thin, per the audit's own framing: "not a Jira competitor, just enough
-- to answer 'what are we delivering and by when' per client." A project
-- is a named deliverable with an optional target date; existing tasks
-- optionally belong to one via a new nullable column — no change to how
-- tasks/requests work when a task isn't part of a project.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references organisations(id),
  client_id uuid not null references clients(id),
  name text not null,
  target_date date,
  -- active | done. No "on hold" / "cancelled" yet — deliberately just the
  -- two states the audit's own framing needs; add more only if a real
  -- tenant asks for them.
  status text not null default 'active'
);

alter table projects enable row level security;

alter table tasks add column if not exists project_id uuid references projects(id);

create index if not exists projects_org_id_idx on projects (org_id);
create index if not exists projects_client_id_idx on projects (client_id);
create index if not exists tasks_project_id_idx on tasks (project_id);
