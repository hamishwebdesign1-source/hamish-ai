-- Run this once in the Supabase SQL editor for your project.
-- Roadmap item #7 ("ongoing competitive intelligence") — points
-- discoverLeads()'s existing live-web-research pattern (discover-leads.ts)
-- at an org's *existing* clients' competitors instead of at new
-- prospects, surfacing a real, current, verifiable finding as a
-- retention talking point. Same "real data or nothing" discipline as
-- everything else in this app: a row here only ever exists because the
-- model found something genuinely concrete and specific, never a vague
-- or invented one — see competitor-intel.ts's own comment.

create table if not exists client_competitor_intel (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references clients(id) on delete cascade,
  -- Denormalised alongside client_id (not just derived via a join) so the
  -- RLS policy below can check it directly, same shape prospects.org_id
  -- already uses for exactly this reason (schema-rls-prospects.sql's own
  -- comment on why prospects needed a direct org_id rather than relying
  -- on a client_members-style relationship).
  org_id uuid not null references organisations(id) on delete cascade,
  headline text not null,
  detail text not null,
  source_url text
);

alter table client_competitor_intel enable row level security;

-- SELECT-only, same convention as prospects_select_own_org — writes
-- (the actual research) only ever happen through the service-role client,
-- from the monthly-reports cron (competitor-intel.ts).
drop policy if exists "client_competitor_intel_select_own_org" on client_competitor_intel;
create policy "client_competitor_intel_select_own_org"
  on client_competitor_intel for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = client_competitor_intel.org_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );

create index if not exists client_competitor_intel_client_id_idx on client_competitor_intel (client_id, created_at desc);
create index if not exists client_competitor_intel_org_id_idx on client_competitor_intel (org_id);
