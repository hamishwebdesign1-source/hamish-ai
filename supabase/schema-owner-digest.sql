-- Run this once in the Supabase SQL editor for your project.
-- Command Centre improvement #2 — owner-facing digest. Studio's own
-- Actions Required / Engagement Risk cards (studio-engagement.ts,
-- page.tsx) have always been pull-only: a tenant only sees them by
-- opening /studio. This column is the opt-out for the weekly email that
-- now pushes the same real numbers to them instead (owner-digest.ts).
-- Default true, same convention as clients.weekly_digest_enabled
-- (schema-portal-settings.sql) -- on by default, self-service to turn off.
alter table organisations add column if not exists owner_digest_enabled boolean not null default true;
