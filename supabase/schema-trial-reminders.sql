-- Run this once in the Supabase SQL editor for your project.
-- P1 platform readiness item, adapted from the audit's "90/60/30-day
-- renewal reminder" framing to what this platform actually has — see
-- trial-reminders.ts for why. Two flags rather than one so the 7-day and
-- 1-day emails are each sent exactly once, not re-sent every time the
-- daily cron runs.

alter table organisations add column if not exists trial_reminder_7d_sent_at timestamptz;
alter table organisations add column if not exists trial_reminder_1d_sent_at timestamptz;
