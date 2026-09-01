// Static metadata for the jobs in vercel.json, plus deterministic
// "next run" math — no cron-parsing library, because every real schedule
// is one of three fixed shapes (daily / weekly-on-a-weekday / monthly-on-
// a-day), and a tiny bespoke calculator for those shapes is simpler and
// more honest than a general parser. All times are UTC, matching how
// Vercel Cron interprets vercel.json.
//
// content-video-pipeline was originally every 5 minutes (a bounded poll
// burst per tick — see that route's own comment) but Vercel's Hobby plan
// only allows daily cron jobs; a */5 schedule fails deployment outright
// ("Hobby accounts are limited to daily cron jobs"), discovered when a
// real deploy attempt failed with exactly that error. Reverted to daily
// — a video still stuck processing after that run's bounded burst now
// waits until the next day's run rather than the next 5-minute tick.
// Upgrading to Vercel Pro would restore the original cadence.
export type CronSpec = {
  name: string; // matches the /api/cron/<name> route folder and cron_runs.cron_name
  label: string;
  description: string;
  schedule: string; // the raw vercel.json cron expression, shown for reference
  nextRun: () => Date;
};

function nextDaily(hour: number): Date {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function nextWeekly(weekday: number, hour: number): Date {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0));
  let daysUntil = (weekday - next.getUTCDay() + 7) % 7;
  if (daysUntil === 0 && next.getTime() <= now.getTime()) daysUntil = 7;
  next.setUTCDate(next.getUTCDate() + daysUntil);
  return next;
}

// minute defaults to 0 — every existing monthly schedule lands on the
// hour; monthly-reports ("30 9 1 * *") is the first one that doesn't,
// caught rather than silently shown 30 minutes early when it was added.
function nextMonthly(dayOfMonth: number, hour: number, minute = 0): Date {
  const now = new Date();
  let next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dayOfMonth, hour, minute));
  if (next.getTime() <= now.getTime()) {
    next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, dayOfMonth, hour, minute));
  }
  return next;
}

export const CRON_SPECS: CronSpec[] = [
  {
    name: "self-check",
    label: "Self-check (hamishai.org)",
    description: "Checks hamishai.org's own uptime and SSL expiry.",
    schedule: "0 6 * * *",
    nextRun: () => nextDaily(6),
  },
  {
    name: "site-checks",
    label: "Client site checks",
    description: "Runs uptime, SSL, and broken-link checks against every active client's website.",
    schedule: "0 8 * * *",
    nextRun: () => nextDaily(8),
  },
  {
    name: "weekly-digest",
    label: "Weekly digest",
    description: "Emails the weekly summary to clients who have it enabled.",
    schedule: "0 8 * * 1",
    nextRun: () => nextWeekly(1, 8),
  },
  {
    name: "lead-discovery",
    label: "Lead discovery",
    description: "Searches for new prospect businesses across the target categories and areas.",
    schedule: "0 7 * * 1",
    nextRun: () => nextWeekly(1, 7),
  },
  {
    name: "content-idea-discovery",
    label: "Content idea discovery",
    description: "Searches for new short-form video ideas across the topic rotation, researching and scoring each one.",
    schedule: "0 7 * * 3",
    nextRun: () => nextWeekly(3, 7),
  },
  {
    name: "content-video-pipeline",
    label: "Content video pipeline",
    description: "Submits ready ideas to ViewMax and polls in-flight video generations, daily (Hobby plan limit — see file header).",
    schedule: "0 10 * * *",
    nextRun: () => nextDaily(10),
  },
  {
    name: "email-inbox",
    label: "Email inbox triage",
    description: "Triages incoming client emails into requests, and checks which drafted lead-outreach emails were actually sent.",
    schedule: "0 12 * * *",
    nextRun: () => nextDaily(12),
  },
  {
    name: "recurring-invoices",
    label: "Recurring invoices",
    description: "Creates this month's invoice for every client on a recurring maintenance plan.",
    schedule: "0 9 1 * *",
    nextRun: () => nextMonthly(1, 9),
  },
  {
    name: "monthly-reports",
    label: "Monthly reports",
    description:
      "Generates and sends this month's dated health-and-activity report snapshot for every client, and researches real competitor intelligence for a handful of clients per opted-in org.",
    schedule: "30 9 1 * *",
    nextRun: () => nextMonthly(1, 9, 30),
  },
  {
    name: "trial-reminders",
    label: "Trial & usage reminders",
    description:
      "Emails an agency on the free trial 3 days out, 1 day out, and the day their trial lapses; warns any org that's crossed 80% of a real monthly usage limit, once per type per month; sends any autonomous-cadence follow-up emails due for orgs that have opted in; and auto-drafts a sales kit for a handful of high-scoring, untouched prospects per opted-in org.",
    schedule: "0 11 * * *",
    nextRun: () => nextDaily(11),
  },
  {
    name: "owner-digest",
    label: "Owner digest",
    description: "Emails each agency owner their own Actions Required and Engagement Risk numbers, for orgs that have it enabled.",
    schedule: "0 9 * * 1",
    nextRun: () => nextWeekly(1, 9),
  },
  {
    name: "health-snapshot",
    label: "Health & adoption snapshot",
    description:
      "Records this week's Business Health score and AI adoption rate for every org, and prunes snapshots past their retention window (2 years / 180 days).",
    schedule: "0 5 * * 1",
    nextRun: () => nextWeekly(1, 5),
  },
  {
    name: "fx-rate",
    label: "FX rate",
    description: "Refreshes the real USD/GBP reference rate used to show Model Performance's estimated cost in pounds.",
    schedule: "0 4 * * *",
    nextRun: () => nextDaily(4),
  },
];
