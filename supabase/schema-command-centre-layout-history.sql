-- Run this once in the Supabase SQL editor for your project.
-- Command Centre Phase 5e — undo/version history for the layout editor.
-- Flagged as a real gap back in the original scoping doc ("worth adding
-- once a customised layout actually has something worth losing") and
-- now genuinely true: the AI Design Assistant (5d) can replace the
-- whole layout in one Save, and custom blocks can be deleted outright.
--
-- Each row is a snapshot of the layout that was about to be overwritten,
-- captured right before a save/reset/revert — so restoring row N gives
-- back exactly what existed immediately before that action. Capped to
-- the 10 most recent snapshots per org (pruned in the write path, not
-- here) — this is an undo stack, not a permanent audit log.

create table if not exists command_centre_layout_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references organisations(id),
  layout jsonb not null,
  -- save | reset | revert — which action was about to overwrite this
  -- snapshot. Not shown to the user (the UI just lists "as of <time>"),
  -- kept for anyone debugging the history table itself later.
  source text not null
);

alter table command_centre_layout_history enable row level security;

create index if not exists command_centre_layout_history_org_id_created_at_idx
  on command_centre_layout_history (org_id, created_at desc);
