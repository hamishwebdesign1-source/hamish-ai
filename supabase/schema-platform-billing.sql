-- Run this once in the Supabase SQL editor, after schema-organisations.sql.
-- Week 6 of the Agency Platform build: real billing. Before this,
-- organisations.plan was set once at signup and never touched again —
-- every tenant got Starter-tier limits for free, forever, with no
-- connection to whether they'd actually paid.
--
-- subscription_status follows Stripe's own subscription status values
-- directly ('trialing', 'active', 'past_due', 'canceled', ...) rather
-- than a bespoke enum, same as clients.subscription_status already does
-- (see the webhook's customer.subscription.updated handler) — one less
-- thing to keep a translation table for.
--
-- trial_ends_at defaults to 14 days from row creation, matching the
-- pricing recommendation's "a 14-day trial gated behind a short call" —
-- the call part didn't survive contact with a fully self-serve wizard,
-- but the 14 days did.

alter table organisations add column if not exists stripe_customer_id text;
alter table organisations add column if not exists stripe_subscription_id text;
alter table organisations add column if not exists subscription_status text not null default 'trialing';
alter table organisations add column if not exists trial_ends_at timestamptz not null default (now() + interval '14 days');

-- HamishAI's own organisation is exempt from the whole trial/subscription
-- concept, set once here explicitly rather than teaching every
-- enforcement check a second special case beyond the is_internal flag it
-- already checks (see discover-leads.ts's own is_internal branch).
update organisations set subscription_status = 'active' where is_internal = true;

create index if not exists organisations_stripe_customer_id_idx on organisations (stripe_customer_id);
create index if not exists organisations_stripe_subscription_id_idx on organisations (stripe_subscription_id);
