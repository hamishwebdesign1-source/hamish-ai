-- Run this once in the Supabase SQL editor for your project.
-- Week 1 of the Agency Platform build (see saas-validation/ and the
-- HamishAI Agency Platform architecture doc). Introduces the tenant
-- boundary the SaaS product needs — "organisations" — one level above
-- clients, which stays exactly what it already was: your own clients'
-- boundary, not a second tenant concept.
--
-- HamishAI itself becomes one row here, is_internal = true, backfilled in
-- schema-backfill-internal-org.sql. Everything downstream (RLS, the
-- eventual /studio workspace, billing) branches on that flag rather than
-- on a separate code path, so there is only ever one system, not two.
--
-- memberships is the same shape as client_members (schema-client-members.sql)
-- one level up: "which organisation is this signed-in person part of,"
-- not "which client." Kept as a second table rather than reusing
-- client_members, since a client_members row means "this person can see
-- one of Hamish's clients' portals" — a fundamentally different
-- relationship to "this person runs an Agency Platform tenant."

create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  -- true for exactly one row: HamishAI's own organisation. Everything
  -- that should stay exclusive to the flagship (the concept-page
  -- generator, the knowledge base, Content Factory) checks this flag
  -- rather than living in a separate table or codebase.
  is_internal boolean not null default false,
  plan text not null default 'starter' check (plan in ('internal', 'starter', 'professional', 'agency')),
  -- Per-org branding (logo url, accent colour, eventually a custom
  -- domain once the white-label add-on ships) — consumed by the existing
  -- OKLCH design-token system, not a new theming mechanism.
  brand jsonb not null default '{}'::jsonb,
  -- Replaces the hardcoded category/neighbourhood rotation in
  -- discover-leads.ts for any non-internal org. HamishAI's own row is
  -- backfilled with its existing rotation as this column's literal
  -- value, so its behaviour doesn't change — see
  -- schema-backfill-internal-org.sql.
  prospecting_config jsonb not null default '{}'::jsonb
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  invited_at timestamptz not null default now(),
  invited_by text,
  accepted_at timestamptz,
  unique (org_id, email)
);

-- No membership row is backfilled for the internal organisation here.
-- /admin's auth (ADMIN_PASSWORD, plus a magic link gated to ADMIN_EMAIL)
-- is a separate privileged path, not a membership check — it keeps
-- working completely unchanged by this migration. A real membership row
-- for Hamish's own login only becomes useful once /studio exists and
-- per-operator identity is worth having (see
-- docs/second-operator-access-model.md); adding one now would be
-- speculative.

alter table organisations enable row level security;
alter table memberships enable row level security;

-- SELECT-only, same convention as client_members: every write to these
-- two tables goes through the service-role client (org creation during
-- onboarding, invites from /studio/settings), which bypasses RLS by
-- design. No write policies are added here on purpose.

drop policy if exists "memberships_select_own" on memberships;
create policy "memberships_select_own"
  on memberships for select
  to authenticated
  using (email = (select auth.jwt() ->> 'email'));

drop policy if exists "organisations_select_own" on organisations;
create policy "organisations_select_own"
  on organisations for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = organisations.id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );

create index if not exists memberships_org_id_idx on memberships (org_id);
create index if not exists memberships_email_idx on memberships (email);
