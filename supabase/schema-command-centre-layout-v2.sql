-- Run this once in the Supabase SQL editor for your project.
-- Command Centre Phase 5b — supersedes Phase 5a's command_centre_cards
-- (never pushed to production, no real customisation exists to migrate)
-- with a real, versioned block layout: organisations.command_centre_layout
-- stores { version: 1, blocks: [{ id, span? }] }. See
-- src/lib/command-centre-layout.ts for the full shape and validation.

alter table organisations drop column if exists command_centre_cards;
alter table organisations add column if not exists command_centre_layout jsonb;
