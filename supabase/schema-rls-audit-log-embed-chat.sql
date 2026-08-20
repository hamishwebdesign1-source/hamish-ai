-- Run this once in the Supabase SQL editor, after schema-audit-log.sql
-- and schema-organisations.sql.
--
-- Phase 4 of "sell a chatbot to your client's own website" — usage
-- visibility. audit_log already logs real events (see audit-log.ts) but
-- has never had an org-staff SELECT policy at all — deliberately: the
-- table mixes many event types, some genuinely internal (admin actions,
-- GDPR erasure), not something to broadly expose via RLS just for this
-- one narrow need.
--
-- This policy is scoped by `action = 'embed_chat.message'` in the USING
-- clause itself, not just org/client — Postgres evaluates that per row,
-- so org staff can only ever see embed-chat-message count rows through
-- this policy, never any other audit_log content, even though it's the
-- same physical table.

drop policy if exists "audit_log_select_embed_chat_own_org" on audit_log;
create policy "audit_log_select_embed_chat_own_org"
  on audit_log for select
  to authenticated
  using (
    action = 'embed_chat.message'
    and exists (
      select 1 from clients c
      join memberships m on m.org_id = c.org_id
      where c.id = audit_log.client_id
        and m.email = (select auth.jwt() ->> 'email')
    )
  );
