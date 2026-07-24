-- Run this once in the Supabase SQL editor for your project.
-- Knowledge base + portal support agent: a small library of answers
-- (general, or scoped to one client) that the support agent draws on to
-- answer client questions instantly instead of every question becoming a
-- ticket. Same convention as the previous schema files: RLS enabled, no
-- public policies — written only via the server-side service-role client
-- from the password-gated /admin routes; read only via the same
-- service-role client from the authenticated /portal routes.

create table if not exists knowledge_base (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid references clients(id),
  title text not null,
  content text not null
);

alter table knowledge_base enable row level security;
