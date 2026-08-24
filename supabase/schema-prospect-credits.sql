-- Run this once in the Supabase SQL editor for your project.
-- Agency Platform — buyable prospect credit top-ups, on top of the fixed
-- monthly plan allowance. A tenant that hits their monthly "up to N
-- researched prospects" cap can buy a top-up pack instead of waiting for
-- next month or upgrading tier.

alter table organisations
  add column if not exists purchased_prospect_credits integer not null default 0;

-- Every completed one-time Stripe Checkout session for a credit pack
-- gets its own row here, keyed uniquely by the Checkout session id.
-- That uniqueness is what makes crediting the balance safe against
-- Stripe's at-least-once webhook delivery: the webhook handler inserts
-- here FIRST, and only increments organisations.purchased_prospect_credits
-- if that insert actually succeeds — a retried delivery for the same
-- session hits the unique constraint and is silently skipped rather
-- than double-crediting the org.
create table if not exists credit_purchases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references organisations(id),
  stripe_checkout_session_id text not null unique,
  credits integer not null,
  amount_pence integer not null
);

alter table credit_purchases enable row level security;

create index if not exists credit_purchases_org_id_idx on credit_purchases (org_id);

-- Atomic increment (not a read-then-write from the app), so two
-- purchases completing close together for the same org can never race
-- and lose an update.
create or replace function increment_prospect_credits(p_org_id uuid, p_amount integer)
returns void
language sql
as $$
  update organisations
  set purchased_prospect_credits = purchased_prospect_credits + p_amount
  where id = p_org_id;
$$;
