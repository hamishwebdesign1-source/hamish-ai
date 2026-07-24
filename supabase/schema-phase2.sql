-- Run this once in the Supabase SQL editor for your project.
-- Phase 2 slice of the HamishAI Operating System: AI Project Manager
-- (aggregated task view, blocker heuristic, progress reports) + on-demand
-- website health checks. Same convention as the previous schema files:
-- RLS enabled, no public policies — written only via the server-side
-- service-role client from the password-gated /admin routes.

alter table clients add column if not exists website_url text;
alter table tasks add column if not exists updated_at timestamptz not null default now();

create table if not exists site_checks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  checked_at timestamptz not null default now(),
  uptime_ok boolean,
  response_ms integer,
  ssl_ok boolean,
  ssl_valid_until timestamptz,
  broken_links jsonb,
  ai_summary text
);

alter table site_checks enable row level security;
