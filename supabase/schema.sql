-- Run this once in the Supabase SQL editor for your project.
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  business_name text,
  business_type text,
  email text not null,
  help_with text,
  source text not null default 'chat_widget'
);

alter table leads enable row level security;

-- No public policies are created: this table is only ever written to via the
-- server-side API route using the service role key, which bypasses RLS.
