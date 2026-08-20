-- Run this once in the Supabase SQL editor, after schema-knowledge-base.sql,
-- schema-knowledge-base-org-scope.sql, and schema-organisations.sql.
--
-- Same shape as clients_select_own_org — knowledge_base has org_id
-- directly on the row (schema-knowledge-base-org-scope.sql), so this is a
-- straight membership match. Only a SELECT policy: writes go through the
-- service-role client from Studio's own Server Actions
-- (knowledge/actions.ts), same convention as every other Studio-writable
-- table. Prerequisite for a Studio knowledge-base editor — before this,
-- org staff had no way to read their own knowledge_base entries at all,
-- only /admin (service-role, bypasses RLS) and each client's own portal
-- (client_members match) could.

drop policy if exists "knowledge_base_select_own_org" on knowledge_base;
create policy "knowledge_base_select_own_org"
  on knowledge_base for select
  to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.org_id = knowledge_base.org_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
