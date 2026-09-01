-- Run this once in the Supabase SQL editor for your project.
-- Studio big-ticket ("proposal send-and-track workflow") — the piece
-- roadmap item #6 (AI-generated proposal PDFs, proposal-pdf.tsx) stopped
-- short of: a tenant could generate and download a proposal, but there
-- was no way to actually send it to a prospect and know what happened
-- next. This is that: a public, no-account "view proposal" link, in the
-- same spirit as digest_action_tokens.sql's public token pattern but its
-- own table -- a proposal has two independent real-world moments worth
-- timestamping (viewed, then separately accepted), not digest_action_
-- tokens' single "used" flag.
--
-- Writes (creating a token, marking viewed/accepted) still only ever go
-- through the service-role client -- sendProposal() (prospects/
-- actions.ts) to create a row, the public /proposal/[token] route to
-- read/update one by its token, neither derived from a signed-in
-- session. Unlike digest_action_tokens (never surfaced back in the UI,
-- so it has no read policy at all), a tenant does want to see their own
-- proposals' sent/viewed/accepted status in Studio itself, so this one
-- gets the same session-scoped SELECT policy as prospects
-- (schema-rls-prospects.sql) -- see that file's own comment for why the
-- memberships-subquery shape below doesn't hit the client_members
-- recursion bug.
create table if not exists proposal_tokens (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  token text not null unique,
  org_id uuid not null references organisations(id) on delete cascade,
  prospect_id uuid not null references prospects(id) on delete cascade,
  -- Denormalised at send time (the address it actually went to), not
  -- re-derived from prospects.email later -- a prospect's own contact
  -- email can change after a proposal was already sent to an older one.
  sent_to text,
  viewed_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz not null
);

alter table proposal_tokens enable row level security;

create index if not exists proposal_tokens_prospect_id_idx on proposal_tokens (prospect_id);
create index if not exists proposal_tokens_org_id_idx on proposal_tokens (org_id);

drop policy if exists "proposal_tokens_select_own_org" on proposal_tokens;
create policy "proposal_tokens_select_own_org"
  on proposal_tokens for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = proposal_tokens.org_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
