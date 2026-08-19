-- Run this once in the Supabase SQL editor, after schema-organisations.sql,
-- schema-backfill-internal-org.sql, and schema-rls-organisations-via-client.sql.
--
-- Real data-isolation bug, not a cosmetic one: knowledge_base's
-- "general" entries (client_id is null) are visible to every signed-in
-- portal client today, via knowledge_base_select_own_or_general
-- (schema-client-members.sql) — "client_id is null" alone, with no org
-- check at all, because the table has never carried an org_id. Every one
-- of HamishAI's own general knowledge entries is currently readable, via
-- RLS, by any Agency Platform tenant's client who happens to sign in —
-- and the reverse would be true too, the moment a tenant's client added
-- their own general entries.
--
-- org_id fixes this the same way every other tenant-scoped table in this
-- project already works: an explicit column, a backfill, and an RLS
-- policy that actually checks it — reusing my_client_org_ids()
-- (schema-rls-organisations-via-client.sql) rather than inlining a
-- second copy of that same client_members -> clients join.

alter table knowledge_base add column if not exists org_id uuid references organisations(id);
update knowledge_base set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
alter table knowledge_base alter column org_id set default '00000000-0000-0000-0000-000000000001';

create index if not exists knowledge_base_org_id_idx on knowledge_base (org_id);

-- Client-specific entries (client_id set) are unaffected — a client_id
-- already implies exactly one org, so client_members_select_own's
-- existing check was never the leaky half of this policy. Only the
-- "general" branch changes: from "client_id is null, visible to anyone
-- signed in" to "client_id is null AND this org is one of mine."
drop policy if exists "knowledge_base_select_own_or_general" on knowledge_base;
create policy "knowledge_base_select_own_or_general"
  on knowledge_base for select
  to authenticated
  using (
    (client_id is null and org_id in (select public.my_client_org_ids()))
    or exists (
      select 1 from client_members m
      where m.client_id = knowledge_base.client_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
