-- Lets a client's concept page be seen and managed from the client detail
-- page in /admin, not just from the originating lead. Concept pages have
-- always been settable on a prospect (prospects.concept_slug) but clients
-- have no link back to the lead that created them (a real gap documented
-- in docs/lily-golf-test-project.md Phase 8 — "no lead-to-client
-- conversion") — so once a lead becomes a client, its concept page becomes
-- invisible from the client's own admin view with no way to see or change
-- it. This is the narrower, immediate fix: give clients their own
-- concept_slug, independent of the originating lead's.
alter table clients add column if not exists concept_slug text;
