-- Run this once in the Supabase SQL editor for your project.
-- The multi-dimensional opportunity score (fit/need/value/confidence) —
-- additive alongside the existing prospects.score column, which stays
-- exactly as computeLeadScore() already computes it. /admin/leads
-- continues to sort and filter by that column completely unaffected;
-- this is new, second information, not a replacement.

alter table prospects add column if not exists score_breakdown jsonb;
