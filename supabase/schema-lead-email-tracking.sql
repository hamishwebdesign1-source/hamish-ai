-- Tracks the real Gmail draft created for a lead's outreach email, so the
-- app can tell "contacted" apart from "drafted but never sent" — see
-- src/lib/gmail-draft.ts for why this replaced the old compose-URL trick.
--
-- Set when a draft is created (draft-lead-email.ts), cleared once the
-- underlying message is confirmed SENT (check-lead-sends.ts) — at which
-- point contacted_at/last_contact_method are set for real, not on draft
-- creation.
alter table prospects add column if not exists pending_email_message_id text;
