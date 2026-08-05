-- Run this once in the Supabase SQL editor for your project.
-- Phase 3 part 1: real Stripe subscriptions for recurring maintenance
-- billing, replacing the cron job that hand-created a fresh invoice every
-- month (recurring-invoices.ts) with Stripe's own subscription engine.
-- maintenance_monthly_pence stays as the per-client custom rate (no
-- change in pricing model, per confirmed decision) -- it now seeds a real
-- subscription instead of being re-read by a cron every month.

alter table clients add column if not exists stripe_subscription_id text;

-- Mirrors Stripe's own subscription.status values (active, past_due,
-- canceled, unpaid, incomplete, ...) -- deliberately kept separate from
-- the existing `status` column (active/paused/churned), which stays an
-- admin-controlled offboarding decision, not something a payment hiccup
-- should silently flip. A client on a temporarily declined card shouldn't
-- suddenly show as "paused" and lose support access; subscription_status
-- is a payment-health signal for the admin overview, not a gate.
alter table clients add column if not exists subscription_status text;
