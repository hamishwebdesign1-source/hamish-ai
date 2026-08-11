-- Phase 8 finding #2 (docs/lily-golf-test-project.md): no lead-to-client
-- conversion exists anywhere — a prospect becoming a client means retyping
-- everything from scratch on a completely separate form, with no link
-- back to where it came from afterward. This is the real fix, not another
-- one-time copy: a genuine, queryable relationship between a client and
-- the lead it was converted from, so "Convert to client" can carry real
-- data across (business name, email, website, concept page, notes) and
-- the lead detail page can show "already converted" instead of offering
-- to do it again.
alter table clients add column if not exists source_lead_id uuid references prospects(id);
