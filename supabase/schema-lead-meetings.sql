-- Run this once in the Supabase SQL editor for your project.
-- Phase 1 of docs/teams-meeting-intelligence-plan.md: scheduling only, no
-- AI yet. `briefing`/`analysis` columns land in later phases (see that
-- doc's section 3) — kept out of this file so each phase's migration
-- matches what that phase's code actually uses, same convention as
-- schema-lead-research.sql / schema-sales-kit.sql building on
-- schema-leads.sql incrementally.
--
-- One row per meeting, not flattened onto prospects — a lead can have
-- more than one meeting over its lifecycle (discovery call, proposal
-- review, ...).

create table if not exists lead_meetings (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id),
  ms_event_id text,
  ms_meeting_id text,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  join_url text,
  status text not null default 'scheduled', -- scheduled | completed | cancelled | no_show
  created_at timestamptz not null default now()
);

alter table lead_meetings enable row level security;
