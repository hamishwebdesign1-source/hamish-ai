-- Freeform notes per lead for /admin/leads.
--
-- Every other field on a prospect row is structured (status, contact
-- details, signal, outreach_note) — there was nowhere to jot the kind of
-- ad hoc context that doesn't fit any of them ("called, no answer, try
-- Thursday afternoon"). See updateLeadNotes in src/app/admin/actions.ts.

alter table prospects add column if not exists notes text;
