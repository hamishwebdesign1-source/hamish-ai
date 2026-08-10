-- Run this once in the Supabase SQL editor for your project.
-- Deep research pipeline Phase 1 (docs/deep-research-pipeline-plan.md) —
-- one row per automatic research run, so the Queued/Researching/
-- Analysing/Completed/Failed/Needs Review status the brief asked for has
-- somewhere real to live, and survives even if the background run (via
-- Next's after()) gets cut off mid-way by the platform's execution-time
-- limit. Same shape/purpose as Stage 5's cron_runs.

create table if not exists research_jobs (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id),
  status text not null default 'queued', -- queued | researching | analysing | completed | failed | needs_review
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists research_jobs_prospect_idx on research_jobs (prospect_id, created_at desc);

alter table research_jobs enable row level security;
