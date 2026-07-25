-- Run this once in the Supabase SQL editor for your project.
-- Billing: real Stripe invoices, generated from the admin tool and sent
-- to the client to pay online. Same convention as the other schema
-- files: RLS enabled, no public policies — written only via the
-- server-side service-role client from the password-gated /admin routes
-- (and the Stripe webhook route, which verifies Stripe's signature
-- instead of the admin cookie).

alter table clients add column if not exists stripe_customer_id text;

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references clients(id),
  request_id uuid references requests(id),
  stripe_invoice_id text,
  stripe_hosted_invoice_url text,
  amount_pence integer not null,
  description text not null,
  status text not null default 'draft',
  due_date date,
  paid_at timestamptz
);

alter table invoices enable row level security;
