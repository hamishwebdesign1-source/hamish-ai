-- Email → wait → call cadence tracking for /admin/leads.
--
-- Previously `contacted_at` was a single generic timestamp set only when
-- someone manually clicked the "Contacted" status pill — it didn't record
-- *how* a lead was last touched (email vs. phone) or whether they ever
-- replied, so the 5-day follow-up nudge couldn't tell "emailed, still
-- waiting" apart from "already called, needs a final follow-up or to be
-- parked". These two columns make that distinction possible; the actual
-- cadence logic lives in src/lib/lead-status.ts.

-- Which channel the most recent touch was ('email' | 'call') — drives
-- whether the next nudge says "call now" or "send a final follow-up".
alter table prospects add column if not exists last_contact_method text;

-- Set the moment Hamish manually marks a lead as having replied (there's
-- no automated inbox-matching for prospects, unlike existing clients —
-- see checkEmailInbox in email-inbox.ts, which only matches known
-- client_members addresses). Once set, the lead drops out of the
-- follow-up cadence entirely regardless of contacted_at.
alter table prospects add column if not exists replied_at timestamptz;
