-- Run this once in the Supabase SQL editor for your project.
-- Command Centre improvement #3 — Business Health trend. computeAgencyHealth()
-- (client-health.ts) has always run fresh on every /studio visit with no
-- history behind it, so the ring could show "72" but never "+4 vs 3
-- weeks ago". One row per org per weekly cron run (health-snapshot.ts) —
-- a real historical record, not a derived/interpolated one. Only ever
-- written when computeAgencyHealth() itself returns a real (non-null)
-- score, same "real data or nothing" rule as everywhere else — an org
-- with no requests/invoices/projects/site-checks yet gets no row, not a
-- fabricated 0.

create table if not exists studio_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references organisations(id),
  health_score int not null
);

alter table studio_health_snapshots enable row level security;

create index if not exists studio_health_snapshots_org_id_created_at_idx
  on studio_health_snapshots (org_id, created_at desc);
