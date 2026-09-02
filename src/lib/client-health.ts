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
//
// computeAgencyHealth() (Command Centre Phase 1) reuses the same four
// percentage calculations, aggregated across a whole org's data instead
// of one client's, plus a fifth dimension (pipeline conversion) that only
// makes sense at agency scope. Genuinely the same underlying maths, not a
// parallel reimplementation — see the shared compute*Pct() helpers below.

export type HealthRequestRow = { id: string; status: string };
export type HealthTaskRow = { id: string; request_id: string | null; status: string };
export type HealthInvoiceRow = { status: string; due_date: string | null; paid_at: string | null };
export type HealthSiteCheckRow = { uptime_ok: boolean | null };

export type HealthComponent = { label: string; value: number };
export type ClientHealth = { healthScore: number | null; components: HealthComponent[] };

function average(nums: number[]) {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : null;
}

function computeUptimePct(siteChecks: HealthSiteCheckRow[]): number | null {
  const withResult = siteChecks.filter((c) => c.uptime_ok !== null);
  return withResult.length ? Math.round((withResult.filter((c) => c.uptime_ok).length / withResult.length) * 100) : null;
}

function computeOnTimePaymentPct(invoices: HealthInvoiceRow[]): number | null {
  const paid = invoices.filter((i) => i.status === "paid" && i.paid_at);
  return paid.length
    ? Math.round((paid.filter((i) => !i.due_date || i.paid_at! <= `${i.due_date}T23:59:59`).length / paid.length) * 100)
    : null;
}

function computeCompletionPct(tasks: HealthTaskRow[]): number | null {
  return tasks.length ? Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100) : null;
}

function computeResponsivenessPct(requests: HealthRequestRow[]): number | null {
  return requests.length
    ? Math.round(((requests.length - requests.filter((r) => r.status === "awaiting_info").length) / requests.length) * 100)
    : null;
}

export function computeClientHealth(
  requests: HealthRequestRow[],
  tasks: HealthTaskRow[],
  invoices: HealthInvoiceRow[],
  siteChecks: HealthSiteCheckRow[]
): ClientHealth {
  const components = [
    { label: "Site uptime", value: computeUptimePct(siteChecks) },
    { label: "On-time payment", value: computeOnTimePaymentPct(invoices) },
    { label: "Work completed", value: computeCompletionPct(tasks) },
    { label: "Requests moving", value: computeResponsivenessPct(requests) },
  ].filter((c): c is HealthComponent => c.value !== null);

  const healthScore = components.length ? Math.round(average(components.map((c) => c.value))!) : null;
  return { healthScore, components };
}

export type AgencyHealthInput = {
  requests: HealthRequestRow[];
  tasks: HealthTaskRow[];
  invoices: HealthInvoiceRow[];
  siteChecks: HealthSiteCheckRow[];
  prospectCount: number;
  clientCount: number;
};

// Command Centre Phase 1 — "Business Health" for the agency itself, not
// one of their clients. Same four real components as computeClientHealth(),
// just aggregated across every client instead of one, plus a fifth
// dimension (pipeline conversion) that's genuinely agency-scoped — a
// single client doesn't have a "conversion rate." Deliberately not the
// brief's full example dimension list (Revenue, Digital performance) —
// this app doesn't have real data for those yet, and the same "only show
// what has real data" rule applies here as everywhere else.
export function computeAgencyHealth(input: AgencyHealthInput): ClientHealth {
  // Bug fix — a brand-new org with prospects but zero clients yet (the
  // normal state for the first few days of prospecting) hit a real trap
  // here: all four client-based components return null (nothing to
  // compute from an empty client roster), leaving "Pipeline conversion"
  // as the *sole* surviving component. 0 clients ÷ N prospects rounds to
  // a real, defined 0%, so the filter above never drops it — the score
  // ends up as a bare, alarming "0" ring that reads as "everything's
  // broken" when the honest story is "you haven't converted a client
  // yet, which is expected." "Business Health" is fundamentally about
  // how well an existing client roster is being served; with zero
  // clients there's nothing yet to have a health score about, so this
  // returns the same "not enough data" null the empty-components case
  // already produces below, rather than a technically-real but
  // misleading number.
  if (input.clientCount === 0) return { healthScore: null, components: [] };

  const conversionPct = input.prospectCount > 0 ? Math.round((input.clientCount / input.prospectCount) * 100) : null;

  const components = [
    { label: "Client sites uptime", value: computeUptimePct(input.siteChecks) },
    { label: "Client payments on time", value: computeOnTimePaymentPct(input.invoices) },
    { label: "Delivery completed", value: computeCompletionPct(input.tasks) },
    { label: "Requests moving", value: computeResponsivenessPct(input.requests) },
    { label: "Pipeline conversion", value: conversionPct },
  ].filter((c): c is HealthComponent => c.value !== null);

  const healthScore = components.length ? Math.round(average(components.map((c) => c.value))!) : null;
  return { healthScore, components };
}
