-- Run this once in the Supabase SQL editor for your project.
-- Content Factory — YouTube publishing (docs/content-factory-plan.md's
-- "Phase 2" section, brought forward on request). One row per publish
-- attempt to a platform, kept deliberately separate from content_videos
-- — that table only ever describes "a video ViewMax generated", never
-- "a post on a platform", exactly so this table could be added later
-- without touching it. TikTok isn't built yet; `platform` is already
-- multi-valued so it can join this same table without a schema change.

create table if not exists platform_posts (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references content_videos(id) on delete cascade,
  idea_id uuid not null references content_ideas(id) on delete cascade,
  created_at timestamptz not null default now(),
  platform text not null default 'youtube', -- youtube | tiktok (tiktok not built yet)
  status text not null default 'pending', -- pending | uploading | published | failed
  privacy_status text not null default 'private', -- private | unlisted | public — YouTube's own vocabulary
  title text,
  description text,
  tags jsonb,
  external_post_id text, -- the platform's own video ID
  external_url text,
  error text,
  published_at timestamptz
);

create index if not exists platform_posts_video_idx on platform_posts (video_id, created_at desc);

alter table platform_posts enable row level security;
