-- Run this once in the Supabase SQL editor for your project.
-- Command Centre improvement #5 — real GBP conversion for Model
-- Performance's cost figure. studio-model-performance.ts's own original
-- comment explained why cost stayed USD-only: an invented exchange rate
-- would be exactly the fabrication the rest of this app refuses to do.
-- This isn't an invented rate — fx-rate.ts's daily cron fetches a real
-- one (European Central Bank reference rate via Frankfurter) and stores
-- it here with when it was fetched, so the dashboard can show a real,
-- dated conversion instead of either a fabricated one or none at all.
-- One row per currency pair — 'USD_GBP' today, extensible later without
-- a schema change.

create table if not exists fx_rates (
  pair text primary key,
  rate numeric not null,
  fetched_at timestamptz not null default now()
);

-- RLS enabled, zero policies — same convention as ai_call_log
-- (schema-ai-call-log.sql): read only via the service-role client from
-- a server-rendered page, never by a session-scoped client directly.
alter table fx_rates enable row level security;
