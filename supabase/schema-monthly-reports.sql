-- Run this once in the Supabase SQL editor for your project.
-- P1 platform readiness item — packaged monthly report. A dated,
-- persisted snapshot of a client's real numbers (reusing computeClientHealth
-- and the same components portal-insights-data.ts already computes live),
-- not a regenerated-every-view figure — the point of a "report" is that it
-- reads the same in six months as it did the day it was generated.

create table if not exists monthly_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references organisations(id),
  client_id uuid not null references clients(id),
  period_start date not null,
  period_end date not null,
  -- { healthScore, components, requestsTotal, requestsCompleted,
  --   tasksTotal, tasksCompleted, spendPence, uptimePct } — see
  -- monthly-report.ts. jsonb rather than a wide column-per-metric table:
  -- this is a point-in-time snapshot, not a row queried/filtered by its
  -- individual fields.
  snapshot jsonb not null
);

alter table monthly_reports enable row level security;

-- One report per client per calendar month — generateMonthlyReport() is
-- idempotent against this constraint (checks first, but this is the real
-- backstop if the monthly cron ever double-fires).
create unique index if not exists monthly_reports_client_period_idx on monthly_reports (client_id, period_start);
create index if not exists monthly_reports_org_id_idx on monthly_reports (org_id);
