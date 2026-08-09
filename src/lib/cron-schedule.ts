// Static metadata for the 6 jobs in vercel.json, plus deterministic
// "next run" math — no cron-parsing library, because all 6 real schedules
// are one of exactly three fixed shapes (daily / weekly-on-a-weekday /
// monthly-on-a-day), and a tiny bespoke calculator for those three shapes
// is simpler and more honest than a general parser for six patterns that
// never change. All times are UTC, matching how Vercel Cron interprets
// vercel.json.
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

function nextMonthly(dayOfMonth: number, hour: number): Date {
  const now = new Date();
  let next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dayOfMonth, hour, 0));
  if (next.getTime() <= now.getTime()) {
    next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, dayOfMonth, hour, 0));
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
];
