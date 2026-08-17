-- Run this once in the Supabase SQL editor, after schema-organisations.sql.
-- Makes HamishAI's own data a normal, labelled tenant instead of a special
-- case: inserts one organisations row for HamishAI itself, adds org_id to
-- every table that's tenant-scoped today, and backfills every existing row
-- onto that one organisation. Existing data doesn't move — it just gets a
-- label it didn't have before. Nothing in /admin or /portal changes
-- behaviour as a result of this file running.
--
-- org_id is deliberately NOT set NOT NULL here. Application code
-- (create-invoice.ts, the admin client-creation action, the lead-discovery
-- cron, etc.) doesn't pass org_id on insert yet — that's a later step, once
-- the Agency Platform's own write paths exist and need a real org_id for a
-- paying tenant. Until then, every new row defaults to HamishAI's org_id
-- below, so unmodified code keeps inserting successfully. Tightening this
-- to NOT NULL is a follow-up once every write path is confirmed to set it
-- explicitly, matching this project's usual "additive, no hard cutover"
-- convention (see subscription.ts's own comment on recurring-invoices.ts
-- for the same pattern applied to billing).
--
-- A fixed, literal UUID is used for HamishAI's own organisation id (rather
-- than letting it default to gen_random_uuid() and looking it up via a
-- subquery) because Postgres column DEFAULTs can't contain a subquery —
-- this way the internal org's id is a plain constant, usable directly in
-- both the backfill UPDATEs and the column DEFAULTs below.

insert into organisations (id, name, slug, is_internal, plan)
values ('00000000-0000-0000-0000-000000000001', 'HamishAI', 'hamishai', true, 'internal')
on conflict (id) do nothing;

alter table clients add column if not exists org_id uuid references organisations(id);
alter table prospects add column if not exists org_id uuid references organisations(id);
alter table requests add column if not exists org_id uuid references organisations(id);
alter table invoices add column if not exists org_id uuid references organisations(id);
alter table site_checks add column if not exists org_id uuid references organisations(id);
alter table audit_log add column if not exists org_id uuid references organisations(id);

update clients set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
update prospects set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
update requests set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
update invoices set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
update site_checks set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
update audit_log set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;

alter table clients alter column org_id set default '00000000-0000-0000-0000-000000000001';
alter table prospects alter column org_id set default '00000000-0000-0000-0000-000000000001';
alter table requests alter column org_id set default '00000000-0000-0000-0000-000000000001';
alter table invoices alter column org_id set default '00000000-0000-0000-0000-000000000001';
alter table site_checks alter column org_id set default '00000000-0000-0000-0000-000000000001';
alter table audit_log alter column org_id set default '00000000-0000-0000-0000-000000000001';

create index if not exists clients_org_id_idx on clients (org_id);
create index if not exists prospects_org_id_idx on prospects (org_id);
create index if not exists requests_org_id_idx on requests (org_id);
create index if not exists invoices_org_id_idx on invoices (org_id);
create index if not exists site_checks_org_id_idx on site_checks (org_id);
create index if not exists audit_log_org_id_idx on audit_log (org_id);

-- HamishAI's own prospecting config, carried over as literal data so
-- discover-leads.ts's behaviour for the internal org is unchanged once it's
-- updated (a later step) to read from here instead of a hardcoded rotation.
-- Central Belt scope and category list per leads/README.md.
update organisations
set prospecting_config = '{
  "geography": ["Edinburgh & the Lothians", "Glasgow", "Falkirk", "Stirling", "West Lothian", "Lanarkshire", "Renfrewshire", "Fife (southern towns)"],
  "categories": ["restaurants", "cafes", "hotels_bnbs", "trades", "salons", "gyms", "independent_retailers", "professional_services", "estate_agents"]
}'::jsonb
where id = '00000000-0000-0000-0000-000000000001';
