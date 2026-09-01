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
// Roadmap item #3 ("predictive churn detection") — early_warning is a
// genuinely new category, not a renamed "warning": it's the one case
// tierFor() below still returns null for (recent contact, no overdue
// invoice — today's "not at risk" case) but whose contact frequency has
// meaningfully dropped, computed by trendFor(). Sorted and styled below
// its two threshold-based siblings — it's a real signal, but a lower-
// confidence, earlier one than either.
export type EngagementTier = "critical" | "warning" | "early_warning";
// null: not enough contact history in the prior window to call a trend
// either way (trendFor()'s own MIN_PRIOR_ACTIVITY floor) — genuinely
// unknown, not "steady" by default.
export type EngagementTrend = "declining" | "steady" | null;
export type ClientEngagementRisk = {
  clientId: string;
  businessName: string;
  tier: EngagementTier;
  quietWeeks: number;
  hasOverdueInvoice: boolean;
  // The specific overdue invoice to act on — null whenever
  // hasOverdueInvoice is false. A client can in principle have more than
  // one open, overdue invoice; the earliest due_date is surfaced (the one
  // that's been outstanding longest), same "pick the most-established
  // signal" instinct as tierFor()'s own escalation rule below.
  overdueInvoiceId: string | null;
  reminderSentAt: string | null;
  trend: EngagementTrend;
  weeks: WeekCell[]; // oldest to newest, WEEKS_BACK long
};

export type EngagementClientRow = { id: string; business_name: string };
export type EngagementRequestRow = { client_id: string; created_at: string };
export type EngagementInvoiceRow = {
  id: string;
  client_id: string;
  status: string;
  due_date: string | null;
  reminder_sent_at: string | null;
};

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

// Roadmap item #3 — compares the most recent RECENT_WEEKS of the same
// 6-week window against the ones before it. Deliberately a coarse
// half-vs-half comparison, not a real regression line: with only 6 weekly
// buckets of a single count per client, a fitted slope would read as more
// precise than the underlying data actually supports. MIN_PRIOR_ACTIVITY
// is the floor that keeps this from firing on noise — a client who's only
// ever sent 1-2 requests total hasn't "declined," they just don't have
// enough history to say anything about yet.
const RECENT_WEEKS = 3;
const MIN_PRIOR_ACTIVITY = 3;
const DECLINE_RATIO = 0.5;

function trendFor(weekCounts: number[]): EngagementTrend {
  const priorCount = weekCounts.slice(0, weekCounts.length - RECENT_WEEKS).reduce((a, b) => a + b, 0);
  const recentCount = weekCounts.slice(weekCounts.length - RECENT_WEEKS).reduce((a, b) => a + b, 0);
  if (priorCount < MIN_PRIOR_ACTIVITY) return null;
  return recentCount <= priorCount * DECLINE_RATIO ? "declining" : "steady";
}

// Among a client's own overdue invoices, picks the one that's been
// outstanding longest (earliest due_date) — the tie-break this card's
// "Send reminder" action needs a single real invoice id for, since a
// client can in principle have more than one open overdue invoice at
// once. Deterministic on a due_date tie via id, so this never flip-flops
// between renders of the same underlying data.
function pickOverdueInvoice(invoices: EngagementInvoiceRow[], clientId: string, todayIso: string): EngagementInvoiceRow | null {
  const overdue = invoices.filter(
    (i) => i.client_id === clientId && i.status === "open" && i.due_date !== null && i.due_date < todayIso
  );
  if (overdue.length === 0) return null;
  return overdue.reduce((earliest, current) => {
    if (current.due_date! < earliest.due_date!) return current;
    if (current.due_date! > earliest.due_date!) return earliest;
    return current.id < earliest.id ? current : earliest;
  });
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
    // Real request counts per bucket, not just a boolean — weeks (the
    // existing 6-cell activity grid) only ever needed "did anything
    // happen," but trendFor() needs how much, so this is computed once
    // and both are derived from it rather than filtering clientRequests
    // twice over the same buckets.
    const weekCounts = buckets.map(
      ({ start, end }) => clientRequests.filter((r) => r.created_at >= start.toISOString() && r.created_at < end.toISOString()).length
    );
    const weeks: WeekCell[] = buckets.map(({ end }, i) => ({ label: weekLabel(end), active: weekCounts[i] > 0 }));

    let quietWeeks = 0;
    for (let i = weeks.length - 1; i >= 0; i--) {
      if (weeks[i].active) break;
      quietWeeks++;
    }

    const overdueInvoice = pickOverdueInvoice(invoices, client.id, todayIso);
    const hasOverdueInvoice = overdueInvoice !== null;
    const trend = trendFor(weekCounts);

    // A declining trend earns its own "early_warning" tier only when
    // nothing stronger already applies — it's a lower-confidence, earlier
    // signal than either threshold, never an escalation past them.
    const tier = tierFor(quietWeeks, hasOverdueInvoice) ?? (trend === "declining" ? "early_warning" : null);
    if (!tier) continue;

    risks.push({
      clientId: client.id,
      businessName: client.business_name,
      tier,
      quietWeeks,
      hasOverdueInvoice,
      trend,
      overdueInvoiceId: overdueInvoice?.id ?? null,
      reminderSentAt: overdueInvoice?.reminder_sent_at ?? null,
      weeks,
    });
  }

  const TIER_WEIGHT: Record<EngagementTier, number> = { critical: 3, warning: 2, early_warning: 1 };
  risks.sort((a, b) => TIER_WEIGHT[b.tier] - TIER_WEIGHT[a.tier] || b.quietWeeks - a.quietWeeks);
  return risks;
}
