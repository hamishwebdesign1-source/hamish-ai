-- Run this once in the Supabase SQL editor for your project.
-- Command Centre Phase 2 — the extensible "data sources" architecture the
-- plan calls for. Deliberately minimal for this phase: real analytics
-- (revenue, prospects, clients, conversion) already live in this app's
-- own tables (invoices, prospects, clients — all kept live by real writes
-- and the Stripe webhook), so no sync job or pre-aggregation table is
-- needed to compute them. This table exists so the Analytics page has a
-- real place to show what's connected today ("Platform data") and what
-- isn't yet (Google Analytics, a CRM, a CSV upload) — the shape future
-- integrations plug into, not a working integration itself yet.

create table if not exists data_sources (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references organisations(id),
  provider text not null, -- 'platform' | 'google_analytics' | 'csv' | ...
  status text not null default 'not_connected' check (status in ('connected', 'needs_attention', 'not_connected')),
  connected_at timestamptz,
  last_synced_at timestamptz,
  metadata jsonb,
  unique (org_id, provider)
);

alter table data_sources enable row level security;

create index if not exists data_sources_org_id_idx on data_sources (org_id);
