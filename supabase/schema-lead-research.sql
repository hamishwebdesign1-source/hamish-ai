-- Run this once in the Supabase SQL editor for your project.
-- High Impact #6/#7 from docs/leads-automation-plan.md: one cached research
-- pass per lead instead of the hand-typed signal/outreach_note process.
--
-- `research` holds both the deterministic site-check (Phase 1 — resolves,
-- SSL, response time, booking form, mobile-friendly, title/meta) and the
-- one Claude call's structured output (Phase 2 — summary, strengths/
-- weaknesses, SEO notes, AI opportunities, suggested angle, estimated
-- value/probability bands) as a single jsonb blob — one column, one
-- generated-at timestamp, one "regenerate" action. See
-- src/lib/research-lead.ts for the shape.
--
-- Deliberately NOT backfilled for existing leads — their score/signal
-- came from real manual research already and shouldn't be silently
-- overwritten by a v1 heuristic. This only populates going forward, for
-- new leads or ones an operator explicitly clicks "Research" on.

alter table prospects add column if not exists research jsonb;
alter table prospects add column if not exists research_generated_at timestamptz;
