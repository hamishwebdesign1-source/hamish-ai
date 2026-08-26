-- Run this once in the Supabase SQL editor for your project.
-- Command Centre improvement #8 (Adoption trend chart) — Client AI
-- Adoption (studio-ai-adoption.ts) has always been a single live
-- number with no history, the same original gap Business Health's own
-- trend (schema-studio-health-snapshots.sql) fixed for that card. Same
-- shape here: one real row per org per weekly snapshot, only ever
-- written when there's a real percentage to record (an org with no
-- clients yet gets no row).
--
-- Deliberately reuses the existing weekly health-snapshot cron
-- (api/cron/health-snapshot) rather than adding a 14th scheduled job —
-- see that route's own comment.

create table if not exists studio_adoption_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references organisations(id),
  adoption_pct int not null
);

-- RLS enabled, select-only for org members — same convention as
-- studio_health_snapshots (schema-rls-studio-health-snapshots.sql).
alter table studio_adoption_snapshots enable row level security;

create index if not exists studio_adoption_snapshots_org_id_created_at_idx
  on studio_adoption_snapshots (org_id, created_at desc);
