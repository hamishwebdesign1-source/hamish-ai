-- Run this once in the Supabase SQL editor for your project.
-- Automation phase: autonomous auto-send for high-confidence replies,
-- email-inbox ingestion, and calendar sync for tasks. Same convention as
-- the previous schema files: RLS enabled, no public policies — written
-- only via the server-side service-role client.

alter table requests add column if not exists auto_sent boolean not null default false;
alter table requests add column if not exists responded_at timestamptz;
alter table tasks add column if not exists calendar_event_id text;

-- Audit trail of emails ingested by the inbox cron — Gmail's own label is
-- the actual dedup mechanism (a processed message is labeled so it's
-- never re-fetched), this table just gives the admin UI something to show.
create table if not exists processed_emails (
  message_id text primary key,
  client_id uuid references clients(id),
  processed_at timestamptz not null default now()
);

alter table processed_emails enable row level security;
alter table processed_emails add column if not exists subject text;
