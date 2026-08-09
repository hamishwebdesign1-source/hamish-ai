-- Run this once in the Supabase SQL editor for your project.
-- Portal redesign Stage 5: a genuine Automation status view needs real
-- data. Until now none of the 6 cron jobs left any record of running at
-- all — only sendErrorAlert() on failure, an email with no persisted
-- history, and total silence on success. One row per invocation, written
-- by the cron route itself right before it returns (see record-cron-run.ts).

create table if not exists cron_runs (
  id uuid primary key default gen_random_uuid(),
  cron_name text not null, -- matches the /api/cron/<name> route folder, e.g. "site-checks"
  status text not null default 'success', -- success | error
  summary jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists cron_runs_name_created_idx on cron_runs (cron_name, created_at desc);

alter table cron_runs enable row level security;
