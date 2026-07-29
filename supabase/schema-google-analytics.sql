-- Run this once in the Supabase SQL editor for your project.
-- AI Business Analytics package entitlement + per-client Google Analytics
-- connection (Phase 1: schema + admin paywall toggle only — the actual
-- OAuth connect/callback flow is built separately, once Google Cloud
-- Console is set up for the analytics.readonly scope). Same convention as
-- the previous schema files: RLS enabled, no public policies — written
-- only via the server-side service-role client from the password-gated
-- /admin routes (the entitlement flag) or the authenticated /portal OAuth
-- callback, once built (the connection itself).

alter table clients add column if not exists analytics_enabled boolean not null default false;

create table if not exists client_google_analytics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references clients(id) unique,
  ga4_property_id text,
  refresh_token text,
  connected_email text,
  connected_at timestamptz
);

alter table client_google_analytics enable row level security;
