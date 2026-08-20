-- Run this once in the Supabase SQL editor for your project.
-- Command Centre Phase 5, first real slice — no-code control over which
-- stat cards show and in what order, saved per-org. Deliberately not the
-- full block-builder vision (§22-23) — just real, working, far-smaller
-- control that's honestly achievable and testable in one pass: an
-- ordered array of card ids, null meaning "use the default set and
-- order" so existing orgs see no behaviour change until they customise.

alter table organisations add column if not exists command_centre_cards jsonb;
