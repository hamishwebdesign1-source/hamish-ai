-- Run this once in the Supabase SQL editor for your project.
-- Run this BEFORE schema-content-usage.sql — that table has a foreign
-- key onto this one.
--
-- Content Factory MVP Phase C (docs/content-factory-plan.md) — one row
-- per ViewMax generation attempt. A real async job table, same shape/
-- purpose as research_jobs: status is durable across the bounded
-- poll-cron's invocations (see src/app/api/cron/content-video-pipeline/
-- route.ts), and a script can be regenerated into a second row without
-- losing the first attempt's history. quality_flags and platform_copy
-- are single-cardinality AI/heuristic outputs per video, so they're
-- jsonb blobs on this row rather than further child tables.
--
-- Kept independent of any future platform_posts table (phase 2 -
-- scheduling/publishing to YouTube/TikTok): this table only ever
-- describes "a video ViewMax generated", never "a post on a platform",
-- so phase 2 can add platform_posts referencing content_videos(id)
-- without touching anything here.

create table if not exists content_videos (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references content_ideas(id) on delete cascade,
  script_id uuid not null references content_scripts(id),
  created_at timestamptz not null default now(),
  status text not null default 'queued', -- queued | submitted | processing | succeeded | failed | canceled | needs_review
  viewmax_task_id text,
  viewmax_model text, -- the model id actually used, chosen live from GET /api/v1/models at submission time — never hardcoded, see src/lib/viewmax.ts
  request_payload jsonb, -- exact body sent to POST /api/v1/videos, for audit/debugging
  credits_spent numeric, -- best-effort delta of GET /api/v1/credits around the submission call
  result_urls jsonb, -- raw data.taskUrls from ViewMax on success, before it's fetched into Storage
  storage_path text, -- Supabase Storage object path once fetched (see src/lib/content-video-storage.ts)
  quality_flags jsonb, -- automated heuristic QC pass — file size sanity, duration match, moderation-block flag
  platform_copy jsonb, -- { title, caption, hashtags[] } from the caption/title/hashtag generation step
  platform_copy_generated_at timestamptz,
  approval_status text not null default 'pending_review', -- pending_review | approved | rejected | needs_edit
  approved_at timestamptz,
  rejection_reason text,
  poll_attempts int not null default 0,
  last_polled_at timestamptz,
  error text,
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists content_videos_idea_idx on content_videos (idea_id, created_at desc);
create index if not exists content_videos_status_idx on content_videos (status, created_at desc);

alter table content_videos enable row level security;
