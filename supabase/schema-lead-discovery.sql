-- Run this once in the Supabase SQL editor for your project.
-- Larger Feature #10 from docs/leads-automation-plan.md: automated weekly
-- lead-discovery job. `discovery_source` marks a lead as AI-discovered
-- (rather than added by hand) and carries the reason it was surfaced, so
-- the operator reviewing the "New this week" queue on /admin/leads can see
-- why without opening research separately. Null for every lead added the
-- existing manual way.

alter table prospects add column if not exists discovery_source jsonb;
