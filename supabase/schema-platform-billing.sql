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
-- trial_ends_at defaults to 7 days from row creation (shortened from the
-- original 14 — see the ALTER at the bottom of this file for why that's
-- a separate statement rather than an edit to the line below: the column
-- already exists on every real database this runs against, so the
-- "add column if not exists ... default (...)" line itself is now inert
-- history, kept as-is for a database that's never seen this file at all
-- and would otherwise create the column with the old 14-day default).

alter table organisations add column if not exists stripe_customer_id text;
alter table organisations add column if not exists stripe_subscription_id text;
alter table organisations add column if not exists subscription_status text not null default 'trialing';
alter table organisations add column if not exists trial_ends_at timestamptz not null default (now() + interval '7 days');

-- HamishAI's own organisation is exempt from the whole trial/subscription
-- concept, set once here explicitly rather than teaching every
-- enforcement check a second special case beyond the is_internal flag it
-- already checks (see discover-leads.ts's own is_internal branch).
update organisations set subscription_status = 'active' where is_internal = true;

create index if not exists organisations_stripe_customer_id_idx on organisations (stripe_customer_id);
create index if not exists organisations_stripe_subscription_id_idx on organisations (stripe_subscription_id);

-- Actually changes the default for every database this has already run
-- on (the add-column line above is a no-op there — the column already
-- exists). Only affects orgs created from here on; doesn't touch
-- trial_ends_at on any org that already exists.
alter table organisations alter column trial_ends_at set default (now() + interval '7 days');
