-- Run this once in the Supabase SQL editor for your project.
-- Command Centre Phase 4 — Marketing Campaign (§27), deliberately thin
-- per the brief's own instruction not to build a full ad platform unless
-- justified: a real wrapper around existing prospecting (name it, set an
-- objective, see which real prospects belong to it and how many
-- converted), not budget/spend tracking or ad-platform integration —
-- no real data exists for either of those yet.

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references organisations(id),
  name text not null,
  objective text,
  -- active | completed. No "paused" yet — add only if a real tenant asks.
  status text not null default 'active'
);

alter table campaigns enable row level security;

alter table prospects add column if not exists campaign_id uuid references campaigns(id);

create index if not exists campaigns_org_id_idx on campaigns (org_id);
create index if not exists prospects_campaign_id_idx on prospects (campaign_id);
