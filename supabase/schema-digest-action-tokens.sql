-- Run this once in the Supabase SQL editor for your project.
-- Roadmap item #4 ("actionable weekly digest") — owner-digest.ts's own
-- summary used to be read-only ("3 follow-ups due"); this is what lets a
-- specific bullet carry a real one-click link that actually clears that
-- exact item, without needing the recipient to already be signed in (a
-- digest lands in an inbox, not a browser tab with a live Studio session).
--
-- Deliberately a bare random token validated by DB lookup, not a signed
-- JWT/HMAC scheme — same "simple, DB-backed" convention as rate_limits'
-- check_rate_limit function rather than a cryptographic library. org_id,
-- action and target_id are captured at token-creation time from an
-- already-org-scoped query inside owner-digest.ts, not supplied by
-- whoever clicks the link — the token itself is the only thing that
-- needs to be unguessable (32 random bytes, hex-encoded), and single-use
-- plus expires_at close that off further.
--
-- /studio-action/[token] (the public page this backs) only ever reads
-- this row to render a confirmation screen on GET; the actual write
-- happens on POST from a real button click — defends against email
-- security scanners that pre-fetch links in inboxes, which would
-- otherwise silently "click" a bare GET-triggers-action link before a
-- human ever saw it.

create table if not exists digest_action_tokens (
  token text primary key,
  org_id uuid not null references organisations(id) on delete cascade,
  action text not null check (action in ('mark_prospect_contacted', 'mark_request_responded', 'mark_project_done')),
  target_id uuid not null,
  -- Denormalised at creation time (e.g. "Acme Cafe — due one more
  -- follow-up") so the confirmation page never needs to re-join back to
  -- prospects/requests/projects, and stays accurate even if that row is
  -- later renamed or deleted before the link is ever clicked.
  label text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

alter table digest_action_tokens enable row level security;

-- RLS enabled, zero policies — service-role only, same convention as
-- rate_limits and usage_events. The public /studio-action/[token] page
-- reads and writes this exclusively through the service-role client; a
-- session-scoped client never touches this table at all, since the
-- whole point is this doesn't require one.

create index if not exists digest_action_tokens_org_id_idx on digest_action_tokens (org_id);
create index if not exists digest_action_tokens_expires_at_idx on digest_action_tokens (expires_at);
