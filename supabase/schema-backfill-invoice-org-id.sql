-- Run this once in the Supabase SQL editor for your project.
-- Studio big-ticket #3 -- the Stripe webhook's invoice.finalized handler
-- (src/app/api/webhooks/stripe/route.ts) never selected/set org_id on
-- the invoices row it creates for a subscription's recurring invoice,
-- so every one of those rows kept invoices.org_id defaulted to
-- HamishAI's own literal org id (schema-backfill-internal-org.sql) --
-- silently misattributing every paying tenant's real subscription
-- revenue on that column. The code path is fixed going forward; this is
-- the one-off correction for whatever rows already exist with the wrong
-- value. Only touches rows that are actually wrong (a real client's
-- own org_id disagrees with what's on the invoice row today) --
-- one-off create-invoice.ts invoices were already correct (that path's
-- own org_id bug was fixed earlier), so this is a no-op for them.
update invoices
set org_id = clients.org_id
from clients
where invoices.client_id = clients.id
  and clients.org_id is not null
  and invoices.org_id is distinct from clients.org_id;
