-- Run this once in the Supabase SQL editor for your project.
-- Command Centre improvement #6 — the TODAY masthead's stat selection.
-- Null means "use the default 4, in their original order"
-- (today-strip-config.ts's resolveTodayStrip()) — same nullable-jsonb-
-- with-a-code-side-default convention as organisations.command_centre_layout
-- (schema-command-centre-layout-v2.sql).
alter table organisations add column if not exists today_strip_stats jsonb;
