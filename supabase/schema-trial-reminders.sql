-- Run this once in the Supabase SQL editor for your project.
-- P1 platform readiness item, adapted from the audit's "90/60/30-day
-- renewal reminder" framing to what this platform actually has — see
-- trial-reminders.ts for why. Three flags rather than one so the 7-day,
-- 1-day and trial-ended emails are each sent exactly once, not re-sent
-- every time the daily cron runs.
--
-- trial_reminder_ended_sent_at added later than the other two: an org
-- whose trial lapses with no card on file stays in subscription_status =
-- 'trialing' forever (nothing in Stripe ever fires to change that, since
-- no subscription was ever created) — so without this flag, an org past
-- its trial_ends_at would just silently go quiet with no explanation of
-- why prospecting stopped, rather than getting told once what happened
-- and how to fix it.

alter table organisations add column if not exists trial_reminder_7d_sent_at timestamptz;
alter table organisations add column if not exists trial_reminder_1d_sent_at timestamptz;
alter table organisations add column if not exists trial_reminder_ended_sent_at timestamptz;
