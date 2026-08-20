-- Run this once in the Supabase SQL editor for your project.
-- Platform readiness audit P1: a real CRM pipeline. prospects.status had
-- no CHECK constraint (schema-leads.sql), so no migration is needed for
-- the two new status values themselves (qualified, lost) — this only
-- adds what the old three-status pipeline had no room for at all: an
-- optional expected deal value, so a tenant can see real pipeline £,
-- not just a prospect count.

alter table prospects add column if not exists deal_value_pence integer;
