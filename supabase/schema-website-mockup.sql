-- Run this once in the Supabase SQL editor for your project.
-- The lightweight "website mockup" feature — customer-facing homepage
-- copy for a prospect, generated from the research already paid for
-- (research-lead.ts), cached the same way research/sales_kit already
-- are: a jsonb column + a generated_at timestamp, never regenerated
-- except by an explicit click.

alter table prospects add column if not exists website_mockup jsonb;
alter table prospects add column if not exists website_mockup_generated_at timestamptz;
