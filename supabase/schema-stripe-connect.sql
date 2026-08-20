-- Run this once in the Supabase SQL editor for your project.
-- Agency Platform client billing, phase 1: tenant Stripe Connect accounts.
--
-- Deliberately separate from organisations.stripe_customer_id /
-- stripe_subscription_id (schema-platform-billing.sql) — those represent
-- the tenant as a *payer* (their own subscription to this platform).
-- These represent the tenant as a *payee* (a Stripe Express account that
-- receives their own clients' invoice payments directly, never touching
-- HamishAI's own balance). Two different relationships to Stripe, two
-- different column pairs.

alter table organisations add column if not exists stripe_connect_account_id text;
alter table organisations add column if not exists stripe_connect_charges_enabled boolean not null default false;

create index if not exists organisations_stripe_connect_account_id_idx on organisations (stripe_connect_account_id);
