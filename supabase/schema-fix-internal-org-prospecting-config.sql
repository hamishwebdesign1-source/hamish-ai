-- Run this once in the Supabase SQL editor, after schema-backfill-internal-org.sql.
-- Corrects a mistake in that file: it approximated HamishAI's own
-- prospecting_config from leads/README.md's summary description, not from
-- discover-leads.ts's actual TARGET_CATEGORIES/TARGET_AREAS constants —
-- different granularity (broad regions vs. specific neighbourhoods) and
-- different labels entirely. Left as-is, parameterising discover-leads.ts
-- to read from this column (see that file's own update) would have
-- silently changed which categories and areas HamishAI's own weekly
-- lead-discovery cron actually searches, the moment this migration and
-- that code change both went live — exactly the kind of quiet regression
-- the "explicit filter + a real check" convention in this codebase exists
-- to catch, so it's worth a dedicated correction rather than folding into
-- another file's comment.
--
-- Also renames the config's keys from {geography, categories} to
-- {areas, categories} to match discover-leads.ts's own area/category
-- terminology exactly, rather than inventing a third vocabulary.

update organisations
set prospecting_config = '{
  "categories": ["Cafe", "Restaurant", "Trades (Joiner)", "Trades (Electrician)", "Trades (Plumbing)", "Salon", "Gym/Fitness Studio", "Hotel/B&B", "Professional Services (Accountant)", "Independent Retailer (Gifts)"],
  "areas": ["Edinburgh", "Leith", "Morningside", "Portobello", "Stockbridge", "Corstorphine", "Falkirk", "Stirling", "Livingston", "Linlithgow", "Glasgow - West End", "Glasgow - Southside"]
}'::jsonb
where id = '00000000-0000-0000-0000-000000000001';
