-- Run this once in the Supabase SQL editor for your project.
-- Real-improvement pass — usage-limits.ts has always had a real,
-- per-plan ceiling on 10 metered actions, but no proactive warning
-- before a tenant actually hit one, unlike trial-reminders.ts's own
-- 3-day/1-day/day-of warnings for the free trial. This table is what
-- makes "warn once per org per event type per month" possible without
-- re-sending the same warning on every daily cron run once a tenant
-- crosses the 80% band — a unique (org_id, event_type, month_start)
-- constraint means the second attempt to record the same warning
-- simply fails, which sendUsageWarnings() treats as "already sent."

create table if not exists usage_warnings_sent (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references organisations(id) on delete cascade,
  event_type text not null,
  month_start date not null,
  unique (org_id, event_type, month_start)
);

-- RLS enabled, zero policies — same convention as ai_call_log
-- (schema-ai-call-log.sql): read/write only via the service-role
-- client from the cron route, never by a session-scoped client.
alter table usage_warnings_sent enable row level security;

create index if not exists usage_warnings_sent_org_id_idx on usage_warnings_sent (org_id);
