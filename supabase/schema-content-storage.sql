-- Run this once in the Supabase SQL editor for your project.
-- Content Factory MVP Phase C (docs/content-factory-plan.md) — no
-- Supabase Storage bucket exists anywhere in this codebase yet; this is
-- the first one. Private (not public): these are unpublished draft
-- videos awaiting human approval, served to /admin via short-lived
-- signed URLs only (see src/lib/content-video-storage.ts), never a
-- public bucket URL.
--
-- If this insert fails on your project (some Supabase plans restrict
-- direct storage.buckets writes from the SQL editor), create the bucket
-- by hand instead: Dashboard -> Storage -> New bucket -> name
-- "content-videos", Public toggle OFF.

insert into storage.buckets (id, name, public)
values ('content-videos', 'content-videos', false)
on conflict (id) do nothing;
