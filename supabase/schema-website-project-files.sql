-- Run this once in the Supabase SQL editor for your project.
-- AI Website Creation Guide, WB8 — real browser-initiated file uploads
-- (plan doc §2), the one piece explicitly flagged in the original
-- architecture plan as genuine new plumbing rather than a five-minute
-- reuse: "Browser-initiated file upload does not exist anywhere in this
-- codebase yet — content-video-storage.ts is the only Supabase Storage
-- usage, and it's server-to-server... The wizard's 'upload files' step
-- is real new plumbing, not a five-minute reuse — scoped out of the
-- first version below rather than built badly." This is that plumbing.
--
-- Second Storage bucket in this codebase (content-videos was the
-- first). Private, never public — served via short-lived signed URLs
-- only (src/lib/website-project-files.ts), same convention as
-- content-video-storage.ts. HamishAI doesn't build the site itself, so
-- these files exist to be *downloaded* by the agency and handed to
-- their AI coding tool (a real logo, real photos) rather than left as
-- a placeholder — never referenced directly by any AI generation call.
--
-- If the storage.buckets insert fails on your project (some plans
-- restrict direct writes from the SQL editor), create the bucket by
-- hand instead: Dashboard -> Storage -> New bucket -> name
-- "website-project-files", Public toggle OFF.

insert into storage.buckets (id, name, public)
values ('website-project-files', 'website-project-files', false)
on conflict (id) do nothing;

create table if not exists website_project_files (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references organisations(id),
  website_project_id uuid not null references website_projects(id),

  storage_path text not null,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null,

  -- logo | photo | other — how it's labelled in the files list so the
  -- agency (and whoever they hand it to) knows what each file actually is.
  kind text not null default 'other'
);

alter table website_project_files enable row level security;

create index if not exists website_project_files_project_id_idx on website_project_files (website_project_id);
create index if not exists website_project_files_org_id_idx on website_project_files (org_id);
