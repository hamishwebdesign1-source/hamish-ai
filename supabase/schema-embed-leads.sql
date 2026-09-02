-- Run this once in the Supabase SQL editor for your project.
-- Studio big-ticket #6 ("embedded chatbot has no lead-capture path") --
-- the embed widget (schema-chatbot-embed.sql) could only ever answer
-- from knowledge_base or say "I can't look that up" -- a genuinely
-- interested visitor asking something the bot couldn't answer had no
-- way to leave contact info, and the agency had no way to show their
-- client "this generated N real leads," only a raw embed_chat.message
-- count (audit_log). This is the real destination that was missing.
--
-- org_id denormalised alongside client_id (not just derived via a join)
-- -- same reasoning every other org-scoped table with a client_id in
-- this app already documents (client_competitor_intel, invoices):
-- lets Studio query this directly with .eq("org_id", orgId) rather than
-- an embedded-resource join every time.
create table if not exists embed_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references clients(id) on delete cascade,
  org_id uuid not null references organisations(id) on delete cascade,
  email text not null,
  -- Whatever the visitor typed when they asked to leave their details --
  -- optional; a bare "get in touch" click with no extra context is
  -- still a real lead worth having.
  message text
);

alter table embed_leads enable row level security;

create index if not exists embed_leads_client_id_idx on embed_leads (client_id);
create index if not exists embed_leads_org_id_idx on embed_leads (org_id);

-- Writes only ever go through the service-role client (the public
-- /api/embed/lead route, called from a tenant's client's own website --
-- no signed-in session to write through even if this had a write
-- policy). SELECT-only, session-scoped so an agency can see their own
-- leads in Studio -- same shape as prospects_select_own_org
-- (schema-rls-prospects.sql).
drop policy if exists "embed_leads_select_own_org" on embed_leads;
create policy "embed_leads_select_own_org"
  on embed_leads for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = embed_leads.org_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
