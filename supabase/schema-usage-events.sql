-- Run this once in the Supabase SQL editor, after schema-organisations.sql.
-- Week 5 of the Agency Platform build: usage metering, so a plan's
-- "up to 30 researched prospects a month" (platform-plans.ts) is an
-- enforced limit, not just pricing-page copy.
--
-- One row per unit of usage rather than a running counter column on
-- organisations, on purpose — same reasoning as audit_log over a mutable
-- status field elsewhere in this project: a row per event is naturally
-- auditable (which prospect, which org, exactly when), trivially supports
-- more event types later without a schema change, and a monthly count is
-- just `count(*) where created_at >= start of month` rather than needing
-- a separate reset job to zero a counter every billing cycle.
--
-- No atomic check-and-increment function the way check_rate_limit
-- (schema-rate-limits.sql) has — that pattern exists there because many
-- concurrent requests can race on the same key. Usage events are recorded
-- one at a time inside a single sequential discoverLeads() run per org, so
-- a plain select-then-insert from usage-limits.ts is enough; the failure
-- mode of a genuine race (two simultaneous discovery runs for the same
-- org) is a few extra prospects over the cap in a rare edge case, not a
-- security boundary worth a stored procedure for.

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  event_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_org_type_created_idx on usage_events (org_id, event_type, created_at);

-- RLS enabled, zero policies — service-role only, same convention as
-- rate_limits and every other internal-only table. Usage counts are
-- surfaced to a tenant through /studio via a server-rendered page (the
-- service-role client), not read directly by a session-scoped client, so
-- there's no session-facing read path that needs a policy here.
alter table usage_events enable row level security;
