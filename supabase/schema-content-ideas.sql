-- Run this once in the Supabase SQL editor for your project.
-- Content Factory MVP (docs/content-factory-plan.md) — the parent entity
-- for the whole pipeline (Idea Discovery -> Research -> Scoring -> Script
-- -> Video -> Approval), same "one parent table, cached jsonb per stage"
-- shape as prospects in schema-leads.sql. `status` is the single source of
-- truth for which pipeline stage an idea is sitting at, read by the
-- /admin/content-factory FilterTabs the same way prospects.status drives
-- /admin/leads. Same convention as every other table here: RLS enabled,
-- no public policies — written only via the server-side service-role
-- client from the password-gated /admin routes.

create table if not exists content_ideas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  concept text not null, -- one/two sentence hook/premise
  topic text, -- freeform topic/niche label, same loose vocabulary as prospects.category
  platform_target text not null default 'shorts', -- shorts | tiktok | reels -- informational only in the MVP; no publishing happens against it yet, see docs/content-factory-plan.md
  status text not null default 'new', -- new | researching | researched | rejected | script_review | ready_for_video | generating_video | video_review | approved | failed
  source text not null default 'ai', -- ai | manual
  discovery_source jsonb, -- { why_suggested, search_topic } when source = 'ai', mirrors prospects.discovery_source
  research jsonb, -- cached AI research pass — trend validation, audience fit, competitor examples, risk notes (see src/lib/research-content-idea.ts)
  research_generated_at timestamptz,
  score numeric, -- 0-5, deterministic formula over `research` (see computeIdeaScore) — same "transparent v1 formula" convention as prospects.score
  score_breakdown jsonb, -- named components that produced `score`, for audit/debugging the formula
  rejected_reason text,
  rejected_at timestamptz,
  content_domain text not null default 'general', -- general | amazon_affiliate — the same idea->script->video pipeline reused for a second content type. Added 2026-08-13, see the "Video Affiliate Engine" blueprint.
  affiliate_product jsonb -- { product_name, asin, footage_source, footage_status, draft_amazon_url } — only populated when content_domain = 'amazon_affiliate'
);

create index if not exists content_ideas_status_created_idx on content_ideas (status, created_at desc);

alter table content_ideas enable row level security;
