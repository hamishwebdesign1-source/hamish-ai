-- Run this once in the Supabase SQL editor for your project.
-- High Impact #8 from docs/leads-automation-plan.md: one "sales kit" call
-- instead of six separate drafting calls (initial email, follow-up email,
-- call script, LinkedIn message, meeting agenda, proposal outline).
--
-- `sales_kit` holds the full structured output of that one Claude call as
-- a single jsonb blob — one column, one generated-at timestamp, one
-- "regenerate" action, same caching pattern as `research` in
-- schema-lead-research.sql. See src/lib/draft-sales-kit.ts for the shape.
--
-- Never backfilled for existing leads — only populated going forward, when
-- an operator explicitly clicks "Generate sales kit" (or "Re-generate").

alter table prospects add column if not exists sales_kit jsonb;
alter table prospects add column if not exists sales_kit_generated_at timestamptz;
