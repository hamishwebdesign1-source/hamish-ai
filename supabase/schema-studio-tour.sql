-- Run this once in the Supabase SQL editor for your project.
-- Command Centre Phase 4 — first-login product tour (§26). One nullable
-- timestamp: null means "hasn't seen it," set (whether finished or
-- skipped — both count) means "don't show it automatically again." Real
-- state, not a client-only flag, so it survives across devices/browsers
-- for the same org, unlike Help Mode's own per-browser localStorage
-- preference.

alter table organisations add column if not exists tour_completed_at timestamptz;
