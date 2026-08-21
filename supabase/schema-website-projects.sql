-- Run this once in the Supabase SQL editor for your project.
-- AI Website Creation Guide, WB1 — HamishAI does not build or host
-- websites; this is the instructional layer around external agentic
-- coding tools (Claude Code, Codex, Cursor). A website_project tracks
-- one client's website build through Discovery -> Brief -> Tool ->
-- Build -> QA -> Launched, with the agency doing the actual building
-- externally.
--
-- Deliberately its own table, not an extension of the existing
-- `projects` (lightweight name/target-date/status delivery tracker) -
-- that table is far too shallow to hold discovery answers, a generated
-- brief, and a 10-phase build-instruction package. Same reasoning
-- campaigns got its own table rather than overloading prospects.

create table if not exists website_projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references organisations(id),
  client_id uuid not null references clients(id),

  -- discovery | brief | tool | build | qa | launched
  stage text not null default 'discovery',

  -- Wizard answers: business info, objectives, sitemap, design
  -- preferences, content notes. Text/select only for v1 - no file
  -- upload infrastructure exists in this app yet.
  discovery jsonb,

  -- The generated Website Build Brief - the project's source of truth.
  brief jsonb,
  brief_generated_at timestamptz,

  -- "Which AI Tool Should I Use?" quiz answers + the recommendation.
  tool_quiz_answers jsonb,
  recommended_tool text,

  -- All 10 build phases as one array: [{ id, name, instructions,
  -- checklist: [{item, done}], completed_at }]. A fixed, known set, not
  -- user-created/reorderable the way Command Centre blocks are, so one
  -- jsonb array here rather than a child table.
  build_phases jsonb,
  build_phases_generated_at timestamptz,
  current_phase_index integer not null default 0,

  -- Filled in at Launch.
  live_url text,
  analytics_connected boolean not null default false
);

alter table website_projects enable row level security;

create index if not exists website_projects_org_id_idx on website_projects (org_id);
create index if not exists website_projects_client_id_idx on website_projects (client_id);
