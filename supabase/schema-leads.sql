-- Run this once in the Supabase SQL editor for your project.
-- Brings the Edinburgh lead-finder tracker (previously a flat CSV) into
-- the same system as everything else — visible and workable from
-- /admin/leads instead of a file on disk. Same convention as the other
-- schema files: RLS enabled, no public policies — written only via the
-- server-side service-role client from the password-gated /admin routes.
--
-- Named "prospects" rather than "leads" — a "leads" table already exists
-- for chatbot-captured contact-form leads (a separate, earlier feature);
-- reusing the name would have silently no-opped against that table
-- instead of creating this one (found this the hard way).

create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  found_at date not null default current_date,
  business_name text not null,
  category text,
  neighbourhood text,
  website text,
  score integer,
  signal text,
  outreach_note text,
  status text not null default 'needs_verification'
);

alter table prospects enable row level security;

-- Added later: contact email, so the admin UI can draft and open a
-- personalised outreach email directly in Gmail per lead.
alter table prospects add column if not exists email text;

-- Added later: when a lead was last marked "contacted", so the admin UI
-- can flag ones that have gone quiet and need a follow-up nudge.
alter table prospects add column if not exists contacted_at timestamptz;
