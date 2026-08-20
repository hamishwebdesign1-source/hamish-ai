// Client health score — shared between the client-facing portal
// (portal-insights-data.ts, where this logic originally lived) and the
// agency-facing Studio clients list (P1 platform readiness item). Pulled
// out into its own module so both sides compute the exact same number
// off the exact same rules, rather than two implementations drifting
// apart over time.
//
// Deliberately only the four real, non-fabricated components the portal
// already used: site uptime, on-time payment, work completion, requests
// moving. No portal-login recency — that data doesn't exist anywhere in
// this codebase (checked, not assumed), and the audit's own rule for
// every number in this app is real data or nothing, never an invented
// stand-in.

export type HealthRequestRow = { id: string; status: string };
export type HealthTaskRow = { id: string; request_id: string | null; status: string };
export type HealthInvoiceRow = { status: string; due_date: string | null; paid_at: string | null };
export type HealthSiteCheckRow = { uptime_ok: boolean | null };

export type HealthComponent = { label: string; value: number };
export type ClientHealth = { healthScore: number | null; components: HealthComponent[] };

function average(nums: number[]) {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : null;
}

export function computeClientHealth(
  requests: HealthRequestRow[],
  tasks: HealthTaskRow[],
  invoices: HealthInvoiceRow[],
  siteChecks: HealthSiteCheckRow[]
): ClientHealth {
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

  const completionPct = tasks.length ? Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100) : null;

  const responsivenessPct = requests.length
    ? Math.round(((requests.length - requests.filter((r) => r.status === "awaiting_info").length) / requests.length) * 100)
    : null;

  const components = [
    { label: "Site uptime", value: uptimePct },
    { label: "On-time payment", value: onTimePct },
    { label: "Work completed", value: completionPct },
    { label: "Requests moving", value: responsivenessPct },
  ].filter((c): c is HealthComponent => c.value !== null);

  const healthScore = components.length ? Math.round(average(components.map((c) => c.value))!) : null;

  return { healthScore, components };
}
