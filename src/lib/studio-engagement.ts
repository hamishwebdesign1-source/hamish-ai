// Command Centre Phase 6c — Engagement Risk. The Mission Control concept
// this was pitched from assumed a new per-client event log (portal
// logins, email opens) would be needed to build this. Investigating the
// real schema before writing any migration found client-health.ts had
// already answered that question, explicitly: "No portal-login recency —
// that data doesn't exist anywhere in this codebase (checked, not
// assumed)". Rather than build the tracking infrastructure client-health.ts
// deliberately chose not to, this reuses what's already real and
// per-client: how recently a client has actually contacted the agency
// (requests.created_at) and whether they're currently behind on an
// invoice (invoices.status/due_date) — zero new tables, zero new
// instrumentation, the same "real data or nothing" rule as everywhere
// else in this app.

export type WeekCell = { label: string; active: boolean };
export type EngagementTier = "critical" | "warning";
export type ClientEngagementRisk = {
  clientId: string;
  businessName: string;
  tier: EngagementTier;
  quietWeeks: number;
  hasOverdueInvoice: boolean;
  weeks: WeekCell[]; // oldest to newest, WEEKS_BACK long
};

export type EngagementClientRow = { id: string; business_name: string };
export type EngagementRequestRow = { client_id: string; created_at: string };
export type EngagementInvoiceRow = { client_id: string; status: string; due_date: string | null };

const WEEKS_BACK = 6;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Rolling 7-day buckets ending at `now`, same "coarsen into fixed-width
// windows" approach studio-analytics.ts's own bucketSeries() uses for the
// chart series — not calendar weeks, since a rolling window is what
// actually answers "how long has it been" regardless of which weekday
// today happens to be.
function weekBuckets(now: Date): { start: Date; end: Date }[] {
  const buckets: { start: Date; end: Date }[] = [];
  for (let i = WEEKS_BACK - 1; i >= 0; i--) {
    const end = new Date(now.getTime() - i * 7 * MS_PER_DAY);
    const start = new Date(end.getTime() - 7 * MS_PER_DAY);
    buckets.push({ start, end });
  }
  return buckets;
}

function weekLabel(end: Date): string {
  return end.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// High bar for "critical": a full month of silence, or two quiet weeks
// stacked on top of an invoice they're already behind on — two real
// signals agreeing is a stronger claim than either alone. "warning" is
// the more common, lower-confidence case: something real, but on its own
// still plausibly nothing (a client can go two quiet weeks for a dozen
// good reasons). Clients that clear both bars simply aren't returned —
// same "only surface it when it's real" rule as generateInsights() not
// returning a KPI insight for a change under MEANINGFUL_PCT.
function tierFor(quietWeeks: number, hasOverdueInvoice: boolean): EngagementTier | null {
  if (quietWeeks >= 4 || (quietWeeks >= 2 && hasOverdueInvoice)) return "critical";
  if (quietWeeks >= 2 || hasOverdueInvoice) return "warning";
  return null;
}

export function computeClientEngagementRisk(
  clients: EngagementClientRow[],
  requests: EngagementRequestRow[],
  invoices: EngagementInvoiceRow[],
  now: Date
): ClientEngagementRisk[] {
  const buckets = weekBuckets(now);
  const todayIso = now.toISOString().slice(0, 10);

  const risks: ClientEngagementRisk[] = [];
  for (const client of clients) {
    const clientRequests = requests.filter((r) => r.client_id === client.id);
    const weeks: WeekCell[] = buckets.map(({ start, end }) => ({
      label: weekLabel(end),
      active: clientRequests.some((r) => r.created_at >= start.toISOString() && r.created_at < end.toISOString()),
    }));

    let quietWeeks = 0;
    for (let i = weeks.length - 1; i >= 0; i--) {
      if (weeks[i].active) break;
      quietWeeks++;
    }

    const hasOverdueInvoice = invoices.some(
      (i) => i.client_id === client.id && i.status === "open" && i.due_date !== null && i.due_date < todayIso
    );

    const tier = tierFor(quietWeeks, hasOverdueInvoice);
    if (!tier) continue;

    risks.push({ clientId: client.id, businessName: client.business_name, tier, quietWeeks, hasOverdueInvoice, weeks });
  }

  const TIER_WEIGHT: Record<EngagementTier, number> = { critical: 2, warning: 1 };
  risks.sort((a, b) => TIER_WEIGHT[b.tier] - TIER_WEIGHT[a.tier] || b.quietWeeks - a.quietWeeks);
  return risks;
}
