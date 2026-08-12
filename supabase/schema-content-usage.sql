-- Run this once in the Supabase SQL editor for your project.
-- Content Factory MVP Phase C (docs/content-factory-plan.md) — this
-- codebase has never tracked AI/generation cost anywhere before now.
-- Deliberately minimal: one row per metered call (an Anthropic call or a
-- ViewMax credit-consuming call), not a full billing system — just
-- enough for a rough spend view and to see where cost actually goes.
-- Written by src/lib/content-ai-usage.ts's recordContentUsage(),
-- fire-and-forget, same pattern as logAuditEvent.

create table if not exists content_ai_usage (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references content_ideas(id) on delete set null,
  video_id uuid references content_videos(id) on delete set null,
  stage text not null, -- idea_discovery | idea_research | script_generation | video_prompt | caption_generation | viewmax_video
  provider text not null, -- anthropic | viewmax
  units numeric not null, -- input+output tokens (anthropic) or credits consumed (viewmax)
  unit_type text not null, -- tokens | credits
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists content_ai_usage_idea_idx on content_ai_usage (idea_id, created_at desc);

alter table content_ai_usage enable row level security;
