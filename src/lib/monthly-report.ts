import { getSupabaseAdmin } from "@/lib/supabase";
import { computeClientHealth } from "@/lib/client-health";
import { sendClientEmail } from "@/lib/send-client-email";

// P1 platform readiness item — "reuse portal-insights-data.ts's real
// numbers, format as a dated report artifact, notify the client when a
// new one lands" (the audit's own framing). A snapshot, not a live view —
// generated once per calendar month and stored, so it reads the same
// looking back as it did the day it was made.

export type MonthlyReportSnapshot = {
  healthScore: number | null;
  components: { label: string; value: number }[];
  requestsTotal: number;
  requestsCompleted: number;
  tasksTotal: number;
  tasksCompleted: number;
  spendPence: number;
  uptimePct: number | null;
};

// The most recently completed calendar month relative to `now` — when the
// monthly cron fires on the 1st, this is the month that just ended.
function lastCalendarMonth(now = new Date()) {
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month
  const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
  return { periodStart, periodEnd };
}

// Reads back the same local Y/M/D used to construct the Date in
// lastCalendarMonth() — never round-trips through toISOString(), which
// converts to UTC and silently shifts the date by a day on a server
// running in a timezone ahead of UTC (caught live: this produced
// "2026-06-30" for what should have been "2026-07-01" before the fix).
function toDateStr(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function computeSnapshot(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  clientId: string,
  periodStart: string,
  periodEnd: string
): Promise<MonthlyReportSnapshot> {
  const periodEndExclusive = `${periodEnd}T23:59:59`;

  const { data: requestsData } = await admin
    .from("requests")
    .select("id, status, responded_at, created_at")
    .eq("client_id", clientId)
    .gte("created_at", periodStart)
    .lte("created_at", periodEndExclusive);
  const requests = requestsData ?? [];

  const requestIds = requests.map((r) => r.id);
  const { data: tasksData } = requestIds.length
    ? await admin.from("tasks").select("id, request_id, status").in("request_id", requestIds)
    : { data: [] };
  const tasks = tasksData ?? [];

  const { data: invoicesData } = await admin
    .from("invoices")
    .select("status, due_date, paid_at, amount_pence")
    .eq("client_id", clientId)
    .gte("created_at", periodStart)
    .lte("created_at", periodEndExclusive);
  const invoices = invoicesData ?? [];

  const { data: siteChecksData } = await admin
    .from("site_checks")
    .select("uptime_ok")
    .eq("client_id", clientId)
    .gte("checked_at", periodStart)
    .lte("checked_at", periodEndExclusive);
  const siteChecks = siteChecksData ?? [];

  const { healthScore, components } = computeClientHealth(requests, tasks, invoices, siteChecks);
  const withUptimeResult = siteChecks.filter((c) => c.uptime_ok !== null);

  return {
    healthScore,
    components,
    requestsTotal: requests.length,
    // "Completed" = responded_at is set — the same real signal
    // portal-insights-data.ts's own funnel and RequestsPanel's "Responded"
    // badge already use, not requests.status (which only ever holds new /
    // awaiting_info / triaged — there's no "done" value on this table).
    requestsCompleted: requests.filter((r) => r.responded_at).length,
    tasksTotal: tasks.length,
    tasksCompleted: tasks.filter((t) => t.status === "done").length,
    spendPence: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount_pence, 0),
    uptimePct: withUptimeResult.length
      ? Math.round((withUptimeResult.filter((c) => c.uptime_ok).length / withUptimeResult.length) * 100)
      : null,
  };
}

// One client, one month. Idempotent against the client_id+period_start
// unique index — calling this twice for the same month is a no-op the
// second time, not a duplicate report.
export async function generateMonthlyReport(clientId: string, now = new Date()) {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." as const };

  const { data: client } = await admin.from("clients").select("id, org_id, business_name, email").eq("id", clientId).single();
  if (!client) return { error: "Client not found." as const };

  const { data: org } = await admin.from("organisations").select("is_internal").eq("id", client.org_id).single();

  const { periodStart, periodEnd } = lastCalendarMonth(now);
  const periodStartStr = toDateStr(periodStart);
  const periodEndStr = toDateStr(periodEnd);

  const { data: existing } = await admin
    .from("monthly_reports")
    .select("id")
    .eq("client_id", clientId)
    .eq("period_start", periodStartStr)
    .maybeSingle();
  if (existing) return { ok: true as const, skipped: "already generated" as const };

  const snapshot = await computeSnapshot(admin, clientId, periodStartStr, periodEndStr);

  const { data: report, error } = await admin
    .from("monthly_reports")
    .insert({ org_id: client.org_id, client_id: clientId, period_start: periodStartStr, period_end: periodEndStr, snapshot })
    .select("id")
    .single();
  if (error || !report) return { error: "Failed to save the report." as const };

  // Email notification is gated to HamishAI's own internal org for the
  // same reason weekly-digest.ts's send is: sendClientEmail()'s
  // from-address is hardcoded to hello@hamishai.org, so an automatic email
  // to a real tenant's client would be signed with the wrong identity.
  // Tenant clients still get the report — it's in their portal the moment
  // it's generated, surfaced via the same notification-bell event feed
  // (portal-events.ts) every other real portal event already uses, no
  // email required to "notify" them within their own authenticated
  // session.
  if (org?.is_internal && client.email) {
    const monthLabel = periodStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    await sendClientEmail(
      client.email,
      `Your ${monthLabel} report — ${client.business_name}`,
      `Hi,\n\nYour report for ${monthLabel} is ready — ${snapshot.requestsTotal} request${snapshot.requestsTotal === 1 ? "" : "s"}, ${snapshot.tasksCompleted}/${snapshot.tasksTotal} tasks completed${snapshot.uptimePct !== null ? `, ${snapshot.uptimePct}% uptime` : ""}.\n\nLog into your portal to see the full breakdown.\n\n— Hamish AI`
    );
  }

  return { ok: true as const, reportId: report.id };
}

// Every active client with an email, across every org — called by the
// monthly cron (/api/cron/monthly-reports). Not gated to internal here;
// generateMonthlyReport() itself decides who gets the email.
export async function generateMonthlyReportsForAllClients(now = new Date()) {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." as const };

  const { data: clients, error: clientsError } = await admin
    .from("clients")
    .select("id")
    .eq("status", "active")
    .not("email", "is", null);
  if (clientsError) return { error: "Failed to fetch clients." as const };

  const generated: string[] = [];
  for (const client of clients ?? []) {
    const result = await generateMonthlyReport(client.id, now);
    if ("reportId" in result) generated.push(client.id);
  }

  return { generated };
}
