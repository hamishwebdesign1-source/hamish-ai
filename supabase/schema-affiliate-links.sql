-- Run this once in the Supabase SQL editor for your project.
-- Video Affiliate Engine, Phase 0 (see the "Operating Blueprint" artifact
-- and pinterest-amazon-affiliate-project memory) — the click-tracking
-- layer the blueprint calls for regardless of platform: Amazon gives no
-- click/conversion API at all, only a weekly CSV export from the
-- Associates dashboard, so this is the only way to know which video
-- actually drove a click before reconciling against that CSV by hand.
--
-- One link can be attached to a content_idea and/or a content_video, but
-- both are nullable — a link can exist before a video does (e.g. set up
-- while sourcing real product footage) and should survive either being
-- deleted (on delete set null, not cascade — the click history stays
-- meaningful even if the source idea/video is later removed).

create table if not exists affiliate_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text not null unique, -- short code used in /go/{slug}
  idea_id uuid references content_ideas(id) on delete set null,
  video_id uuid references content_videos(id) on delete set null,
  product_name text not null,
  target_url text not null, -- full Amazon URL, including our affiliate tag
  active boolean not null default true, -- flip off rather than delete when a product goes out of stock, so historical clicks stay attributable
  notes text
);

create index if not exists affiliate_links_idea_idx on affiliate_links (idea_id);
create index if not exists affiliate_links_video_idx on affiliate_links (video_id);

create table if not exists affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references affiliate_links(id) on delete cascade, -- unlike affiliate_links' own FKs, a click genuinely has no meaning without its link, so cascade is correct here
  clicked_at timestamptz not null default now(),
  referrer text,
  user_agent text
);

create index if not exists affiliate_clicks_link_idx on affiliate_clicks (link_id, clicked_at desc);

alter table affiliate_links enable row level security;
alter table affiliate_clicks enable row level security;
