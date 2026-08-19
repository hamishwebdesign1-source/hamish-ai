import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAutomationEvents } from "@/lib/portal-events";
import { getPortalOrgBranding } from "@/lib/portal-org-branding";

// Real-data equivalent of the marketing site's illustrative AI Command
// Centre. Every number here is computed from tables we actually have for
// this one client — no fabricated revenue, bookings, or peer-benchmark
// figures. Where the marketing demo shows something we simply don't have
// (a sales funnel, "where leads come from", a 30-day revenue forecast),
// this module computes the closest honest equivalent from our own data
// (a request funnel, request categories, a trend projection of request
// volume) rather than inventing a stand-in number.
//
// Takes a session-scoped Supabase client (the signed-in client's own JWT),
// not the service-role client — Postgres RLS (schema-rls-portal.sql)
// enforces that every query below can only ever return this one client's
// rows, as a second, database-level layer under the .eq("client_id", ...)
// filters already in this file. Both layers stay in place deliberately:
// the explicit filters are what make the code's intent obvious to read;
// RLS is what still protects the data if one of them is ever wrong.

export type InsightsData = Awaited<ReturnType<typeof buildPortalInsights>>;
export type PortalInsights = Exclude<InsightsData, { error: string }>;

type RequestRow = {
  id: string;
  created_at: string;
  status: string;
  category: string | null;
  auto_sent: boolean;
  responded_at: string | null;
};
type TaskRow = { id: string; request_id: string | null; status: string; created_at: string };
type InvoiceRow = {
  amount_pence: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
};
type SiteCheckRow = { checked_at: string; uptime_ok: boolean | null; response_ms: number | null };

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function lastNMonths(n: number) {
  const months: { key: string; label: string; monthIndex: number; year: number }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-GB", { month: "short" }), monthIndex: d.getMonth(), year: d.getFullYear() });
  }
  return months;
}

function average(nums: number[]) {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : null;
}

// Simple two-point trend projection off real monthly totals — deliberately
// not a "forecast" in the marketing-demo sense (no confidence interval, no
// AI model), just "if the last couple of months' pace continues." Returns
// null when there isn't enough history to say anything honest.
function projectNextMonth(monthlyTotals: number[]): number | null {
  if (monthlyTotals.length < 2) return null;
  const recent = monthlyTotals.slice(-3);
  if (recent.every((v) => v === 0)) return null;
  const delta = recent.length > 1 ? (recent[recent.length - 1] - recent[0]) / (recent.length - 1) : 0;
  const projected = Math.round(recent[recent.length - 1] + delta);
  return Math.max(0, projected);
}

export async function buildPortalInsights(supabase: SupabaseClient, clientId: string) {
  const { data: client } = await supabase
    .from("clients")
    .select("id, business_name, website_url, org_id")
    .eq("id", clientId)
    .single();
  if (!client) return { error: "Client not found." as const };

  const orgBranding = await getPortalOrgBranding(supabase, client.org_id);

  const { data: requestsData } = await supabase
    .from("requests")
    .select("id, created_at, status, category, auto_sent, responded_at")
    .eq("client_id", clientId);
  const requests: RequestRow[] = requestsData ?? [];

  const requestIds = requests.map((r) => r.id);
  const { data: tasksData } = requestIds.length
    ? await supabase.from("tasks").select("id, request_id, status, created_at").in("request_id", requestIds)
    : { data: [] };
  const tasks: TaskRow[] = tasksData ?? [];

  const { data: invoicesData } = await supabase
    .from("invoices")
    .select("amount_pence, status, due_date, paid_at, created_at")
    .eq("client_id", clientId);
  const invoices: InvoiceRow[] = invoicesData ?? [];

  const { data: siteChecksData } = client.website_url
    ? await supabase
        .from("site_checks")
        .select("checked_at, uptime_ok, response_ms")
        .eq("client_id", clientId)
        .order("checked_at", { ascending: false })
        .limit(60)
    : { data: [] };
  const siteChecks: SiteCheckRow[] = siteChecksData ?? [];

  // --- Health score components (only real, only included when we have the underlying data) ---
  const withUptimeResult = siteChecks.filter((c) => c.uptime_ok !== null);
  const uptimePct = withUptimeResult.length
    ? Math.round((withUptimeResult.filter((c) => c.uptime_ok).length / withUptimeResult.length) * 100)
    : null;

  const paidInvoices = invoices.filter((i) => i.status === "paid" && i.paid_at);
  const onTimePct = paidInvoices.length
    ? Math.round(
        (paidInvoices.filter((i) => !i.due_date || i.paid_at! <= `${i.due_date}T23:59:59`).length / paidInvoices.length) * 100
      )
    : null;

  const completionPct = tasks.length
    ? Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100)
    : null;

  const responsivenessPct = requests.length
    ? Math.round(((requests.length - requests.filter((r) => r.status === "awaiting_info").length) / requests.length) * 100)
    : null;

  const components = [
    { label: "Site uptime", value: uptimePct },
    { label: "On-time payment", value: onTimePct },
    { label: "Work completed", value: completionPct },
    { label: "Requests moving", value: responsivenessPct },
  ].filter((c): c is { label: string; value: number } => c.value !== null);

  const healthScore = components.length ? Math.round(average(components.map((c) => c.value))!) : null;

  // --- Monthly series (12 months, matching the marketing demo's trend
  // depth — Phase 2 of the roadmap: bring the real dashboard closer to the
  // demo's feel without fabricating anything, just showing more of the
  // history that's already there) ---
  const months = lastNMonths(12);
  const requestsByMonth = months.map((m) => ({
    label: m.label,
    value: requests.filter((r) => monthKey(r.created_at) === m.key).length,
  }));
  const spendByMonth = months.map((m) => ({
    label: m.label,
    value:
      invoices.filter((i) => i.status === "paid" && i.paid_at && monthKey(i.paid_at) === m.key).reduce((s, i) => s + i.amount_pence, 0) / 100,
  }));

  const thisMonthKey = months[months.length - 1].key;
  const lastMonthKey = months[months.length - 2]?.key;
  const requestsThisMonth = requests.filter((r) => monthKey(r.created_at) === thisMonthKey).length;
  const requestsLastMonth = lastMonthKey ? requests.filter((r) => monthKey(r.created_at) === lastMonthKey).length : 0;

  // --- Request funnel: submitted -> became real work -> work finished ---
  const requestsWithTask = requests.filter((r) => tasks.some((t) => t.request_id === r.id));
  const requestsFullyDone = requestsWithTask.filter((r) => {
    const linked = tasks.filter((t) => t.request_id === r.id);
    return linked.length > 0 && linked.every((t) => t.status === "done");
  });
  const funnel = [
    { label: "Requests submitted", value: requests.length },
    { label: "Became real work", value: requestsWithTask.length },
    { label: "Work finished", value: requestsFullyDone.length },
  ];

  // --- Category breakdown ---
  const categoryOrder = ["bug", "feature", "content", "question", "other"];
  const categoryLabels: Record<string, string> = {
    bug: "Bug fixes",
    feature: "New features",
    content: "Content changes",
    question: "Questions",
    other: "Other",
  };
  const categoryBreakdown = categoryOrder
    .map((cat) => ({ category: cat, label: categoryLabels[cat], value: requests.filter((r) => (r.category ?? "other") === cat).length }))
    .filter((c) => c.value > 0);

  // --- Day-of-week x daypart pattern (real, from created_at) ---
  const dayparts = ["Morning", "Afternoon", "Evening"];
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const demandPattern = dayLabels.map((day, dayIdx) => ({
    day,
    slots: dayparts.map((_, partIdx) =>
      requests.filter((r) => {
        const d = new Date(r.created_at);
        const jsDay = (d.getDay() + 6) % 7; // convert Sun=0 -> Mon=0 index
        const hour = d.getUTCHours();
        const part = hour < 12 ? 0 : hour < 17 ? 1 : 2;
        return jsDay === dayIdx && part === partIdx;
      }).length
    ),
  }));

  // --- Automation events (real, chronological) — shared with the header
  // notification bell's lean fetch, see portal-events.ts ---
  const automationEvents = buildAutomationEvents(requests, siteChecks, invoices, 12);

  const autoReplyCount = requests.filter((r) => r.auto_sent).length;
  const siteCheckCount = siteChecks.length;
  const needsInputCount = requests.filter((r) => r.status === "awaiting_info").length;
  const inProgressCount = requests.length - needsInputCount - requestsFullyDone.length;

  // --- Insights (real deltas only, no fabricated impact figures) ---
  type Insight = { id: string; text: string; category: "opportunity" | "risk" | "trend" };
  const insights: Insight[] = [];
  const needsInput = requests.filter((r) => r.status === "awaiting_info").length;
  if (needsInput > 0) {
    insights.push({ id: "needs-input", category: "risk", text: `${needsInput} request${needsInput === 1 ? "" : "s"} still need${needsInput === 1 ? "s" : ""} your input before work can start.` });
  }
  if (requestsLastMonth > 0 && requestsThisMonth !== requestsLastMonth) {
    const dir = requestsThisMonth > requestsLastMonth ? "up" : "down";
    insights.push({ id: "volume-trend", category: "trend", text: `Requests are ${dir} from ${requestsLastMonth} to ${requestsThisMonth} this month.` });
  }
  if (uptimePct !== null) {
    insights.push({ id: "uptime", category: uptimePct === 100 ? "trend" : "risk", text: `Site uptime is ${uptimePct}% over the last ${withUptimeResult.length} checks.` });
  }
  if (autoReplyCount > 0) {
    insights.push({ id: "automation", category: "opportunity", text: `${autoReplyCount} repl${autoReplyCount === 1 ? "y was" : "ies were"} sent automatically — no wait on a human.` });
  }
  if (!insights.length) {
    insights.push({ id: "none-yet", category: "trend", text: "Not enough activity yet to surface a pattern — check back after a few more requests." });
  }

  // --- Projection (own-history trend, not a business forecast) ---
  const projectedRequestsNextMonth = projectNextMonth(requestsByMonth.map((m) => m.value));
  const projectedSpendNextMonth = projectNextMonth(spendByMonth.map((m) => m.value));

  return {
    client,
    orgBranding,
    healthScore,
    components,
    requestsByMonth,
    spendByMonth,
    requestsThisMonth,
    requestsLastMonth,
    funnel,
    categoryBreakdown,
    demandPattern,
    dayparts,
    automationEvents,
    autoReplyCount,
    siteCheckCount,
    needsInputCount,
    inProgressCount,
    insights,
    projectedRequestsNextMonth,
    projectedSpendNextMonth,
    totalRequests: requests.length,
    totalPaid: paidInvoices.reduce((s, i) => s + i.amount_pence, 0) / 100,
    siteChecks,
    uptimePct,
  };
}
