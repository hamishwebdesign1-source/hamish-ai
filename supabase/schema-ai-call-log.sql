-- Run this once in the Supabase SQL editor, after schema-usage-events.sql.
-- Command Centre Phase 6d — Model Performance. usage_events already
-- records *that* a metered AI action happened (for plan-limit
-- enforcement), but only on success — see requestLayoutRedesign()'s own
-- comment on why a failed attempt shouldn't cost quota. Model Performance
-- needs the opposite bias: every real attempt, success or failure, with
-- how long it took and how big it was, none of which usage_events was
-- ever designed to hold. A separate table rather than adding those
-- columns to usage_events, so quota accounting keeps its own simple
-- "count real rows" semantics and never has to filter out failed calls
-- that were deliberately never inserted there.

create table if not exists ai_call_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  -- Studio's own two Claude-backed features today (command-centre-
  -- design-assistant.ts, answer-clients-question.ts). A plain text CHECK,
  -- not an enum type, so adding a third feature later is a one-line
  -- constraint change, not a type migration.
  feature text not null check (feature in ('design_assistant', 'business_analyst')),
  success boolean not null,
  latency_ms integer not null,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create index if not exists ai_call_log_org_created_idx on ai_call_log (org_id, created_at desc);

-- RLS enabled, zero policies — same convention as usage_events: read
-- only via the service-role client from a server-rendered page (the
-- Command Centre's Model Performance card), never by a session-scoped
-- client directly.
alter table ai_call_log enable row level security;
