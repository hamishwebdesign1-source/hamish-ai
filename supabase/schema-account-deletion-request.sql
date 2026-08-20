-- Run this once in the Supabase SQL editor for your project.
-- GDPR minimum-viable compliance, part 3: whole-account deletion.
--
-- Deliberately request-mediated rather than an instant self-service hard
-- delete (unlike deleteClientData() in clients/actions.ts, which is
-- immediate) — a single unconfirmed click destroying an entire org's
-- data (prospects, clients, invoices, a live Stripe Connect account) is
-- a different order of risk from removing one client, and this codebase
-- hasn't earned the right to automate that without a human checkpoint
-- yet. This column is the record that a request was made and when, so
-- Settings can show "requested on X" and refuse to double-submit —
-- actually fulfilling it (the real deletion) is a follow-up operator
-- action, not automated by this migration.

alter table organisations add column if not exists deletion_requested_at timestamptz;
