-- Run this once in the Supabase SQL editor.
-- Adds the character_consistency column that generate-content-scripts.ts's
-- 2026-08-12 narration-first redesign now writes on every script variant.
-- Safe to re-run (IF NOT EXISTS).

alter table content_scripts
  add column if not exists character_consistency text not null default '';
