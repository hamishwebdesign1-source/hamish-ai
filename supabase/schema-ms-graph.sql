-- Run this once in the Supabase SQL editor for your project.
-- Phase 1 of docs/teams-meeting-intelligence-plan.md: Microsoft Graph
-- OAuth token storage.
--
-- Deliberately NOT an env var the way GOOGLE_REFRESH_TOKEN is — Microsoft's
-- v2.0 token endpoint rotates the refresh token on every use (Google's
-- stays static until revoked), and nothing at runtime can rewrite a
-- Vercel env var. This one-row table is the token store instead; see
-- src/lib/ms-graph-auth.ts. Single row, id always 'default'.

create table if not exists ms_graph_tokens (
  id text primary key default 'default',
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table ms_graph_tokens enable row level security;
