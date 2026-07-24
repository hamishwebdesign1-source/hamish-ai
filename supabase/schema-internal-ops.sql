-- Run this once in the Supabase SQL editor for your project.
-- Phase 1 of the HamishAI Operating System: request triage pipeline.
-- Same convention as schema.sql: RLS enabled, no public policies — these
-- tables are only ever written to via the server-side service-role client
-- from the password-gated /admin routes, which bypasses RLS.

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  business_name text not null,
  email text,
  package text,
  maintenance_plan text not null default 'none',
  tech_stack text,
  brand_notes text
);

create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references clients(id),
  raw_text text not null,
  status text not null default 'new',
  category text,
  complexity text,
  suggested_approach text,
  covered_by_maintenance boolean,
  coverage_reasoning text,
  draft_response text,
  priority text,
  missing_info jsonb,
  ai_raw jsonb
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_id uuid references requests(id),
  title text not null,
  description text,
  acceptance_criteria text,
  status text not null default 'todo'
);

alter table clients enable row level security;
alter table requests enable row level security;
alter table tasks enable row level security;
