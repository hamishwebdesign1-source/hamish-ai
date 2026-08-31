import type { SupabaseClient } from "@supabase/supabase-js";

// Command Centre Phase 2 — real analytics computed directly from this
// app's own tables (prospects, clients, invoices, requests), not a
// pre-aggregated snapshot table. Revenue in particular needs no new
// integration at all: invoices.amount_pence/paid_at is already kept live
// by the Stripe webhook, so a tenant's own client-billing revenue is real
// data today, not something Phase 2 has to go and fetch from Stripe's API.

export type AnalyticsRange = "7d" | "30d" | "90d" | "12m";

export const RANGE_LABELS: Record<AnalyticsRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
};

const RANGE_DAYS: Record<AnalyticsRange, number> = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 };

function daysAgoIso(days: number, from: Date): string {
  return new Date(from.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

// Bucket granularity scales with range so a chart never renders 365
// individual daily points for the 12-month view — day/day/week/month for
// 7d/30d/90d/12m respectively, the same coarsening any real analytics
// product applies.
function bucketSizeDays(range: AnalyticsRange): number {
  if (range === "90d") return 7;
  if (range === "12m") return 30;
  return 1;
}

export type Kpi = { label: string; value: number; previousValue: number; format: "money" | "count" };
export type ChartPoint = { label: string; value: number };
// A forecast series is the same shape stretched to cover points that
// haven't happened yet: `value` is the real number where one exists,
// `forecast` is the projected one, and the single point where both are
// set is where the dashed line picks up from the solid one.
export type ForecastPoint = { label: string; value?: number; forecast?: number };
export type AnalyticsData = {
  range: AnalyticsRange;
  periodStart: Date;
  previousPeriodStart: Date;
  kpis: Kpi[];
  revenueSeries: ChartPoint[];
  revenueForecast: ForecastPoint[];
  prospectsSeries: ChartPoint[];
  // Studio improvement — projectSeries() was already a generic projector
  // over any ChartPoint[], applied only to revenue; prospects found is
  // just as real a trend to project forward, and needed no new logic,
  // just calling the same function on the other series.
  prospectsForecast: ForecastPoint[];
};

// Below this many real points, a trend line is describing noise, not a
// trend — same reasoning as MEANINGFUL_PCT in studio-insights.ts: a
// confident-looking projection drawn from too little history is a
// bigger falsehood than showing no projection at all.
const MIN_POINTS_FOR_FORECAST = 4;

// Ordinary least-squares over (bucket index, value) — the plainest trend
// line there is, not a seasonal or ML model. Deliberately never labelled
// "AI" anywhere it's shown: it's arithmetic on this org's own real
// numbers, the same rule/generative distinction studio-insights.ts
// already draws for the insight feed.
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  let numerator = 0;
  let denominator = 0;
  values.forEach((y, x) => {
    numerator += (x - xMean) * (y - yMean);
    denominator += (x - xMean) ** 2;
  });
  const slope = denominator === 0 ? 0 : numerator / denominator;
  return { slope, intercept: yMean - slope * xMean };
}

// Pure and exported on its own so it's directly testable without a
// Supabase client — getStudioAnalytics() below just supplies the real
// series and bucket geometry it already computes for the chart itself.
export function projectSeries(series: ChartPoint[], lastBucketEnd: Date, bucketDays: number, periodsAhead: number): ForecastPoint[] {
  const base: ForecastPoint[] = series.map((p) => ({ label: p.label, value: p.value }));
  if (periodsAhead <= 0 || series.length < MIN_POINTS_FOR_FORECAST) return base;

  const values = series.map((p) => p.value);
  if (values.every((v) => v === 0)) return base; // nothing real to extrapolate from

  const { slope, intercept } = linearRegression(values);
  // Mirror the last real value onto `forecast` too, so the dashed
  // projection visually continues from the solid actual line instead of
  // leaving a gap between them.
  base[base.length - 1] = { ...base[base.length - 1], forecast: base[base.length - 1].value };

  for (let i = 0; i < periodsAhead; i++) {
    const index = series.length + i;
    const predicted = Math.max(0, Math.round(slope * index + intercept)); // revenue can't go negative
    const date = new Date(lastBucketEnd.getTime() + (i + 1) * bucketDays * 24 * 60 * 60 * 1000);
    base.push({ label: bucketLabel(date, bucketDays), forecast: predicted });
  }
  return base;
}

function bucketLabel(date: Date, bucketDays: number): string {
  if (bucketDays >= 30) return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
  if (bucketDays >= 7) return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Sums/counts real rows (each with a `created_at`-shaped ISO date field
// and a numeric value getter) into fixed-width buckets across the period
// — shared by both series below rather than two near-identical loops.
function bucketSeries<T>(rows: T[], getDate: (row: T) => string, getValue: (row: T) => number, periodStart: Date, now: Date, bucketDays: number): ChartPoint[] {
  const points: ChartPoint[] = [];
  let cursor = new Date(periodStart);
  while (cursor < now) {
    const bucketEnd = new Date(Math.min(cursor.getTime() + bucketDays * 24 * 60 * 60 * 1000, now.getTime()));
    const value = rows
      .filter((r) => {
        const d = getDate(r);
        return d >= cursor.toISOString() && d < bucketEnd.toISOString();
      })
      .reduce((sum, r) => sum + getValue(r), 0);
    points.push({ label: bucketLabel(cursor, bucketDays), value });
    cursor = bucketEnd;
  }
  return points;
}

export async function getStudioAnalytics(supabase: SupabaseClient, orgId: string, range: AnalyticsRange, now = new Date()): Promise<AnalyticsData> {
  const days = RANGE_DAYS[range];
  const periodStart = new Date(daysAgoIso(days, now));
  const previousPeriodStart = new Date(daysAgoIso(days * 2, now));

  const { data: clientIdsData } = await supabase.from("clients").select("id, created_at").eq("org_id", orgId);
  const clientIds = (clientIdsData ?? []).map((c) => c.id);

  const [{ data: prospects }, { data: invoices }, { data: requests }] = await Promise.all([
    supabase
      .from("prospects")
      .select("created_at, status")
      .eq("org_id", orgId)
      .gte("created_at", previousPeriodStart.toISOString()),
    clientIds.length
      ? supabase
          .from("invoices")
          .select("amount_pence, status, paid_at")
          .in("client_id", clientIds)
          .eq("status", "paid")
          .gte("paid_at", previousPeriodStart.toISOString())
      : Promise.resolve({ data: [] as { amount_pence: number; status: string; paid_at: string }[] }),
    clientIds.length
      ? supabase
          .from("requests")
          .select("responded_at")
          .in("client_id", clientIds)
          .not("responded_at", "is", null)
          .gte("responded_at", previousPeriodStart.toISOString())
      : Promise.resolve({ data: [] as { responded_at: string }[] }),
  ]);

  const allProspects = prospects ?? [];
  const allInvoices = invoices ?? [];
  const allRequests = requests ?? [];
  const allClients = (clientIdsData ?? []).filter((c) => c.created_at >= previousPeriodStart.toISOString());

  const inCurrentPeriod = (d: string) => d >= periodStart.toISOString();
  const inPreviousPeriod = (d: string) => d >= previousPeriodStart.toISOString() && d < periodStart.toISOString();

  const currentRevenue = allInvoices.filter((i) => inCurrentPeriod(i.paid_at)).reduce((s, i) => s + i.amount_pence, 0);
  const previousRevenue = allInvoices.filter((i) => inPreviousPeriod(i.paid_at)).reduce((s, i) => s + i.amount_pence, 0);

  const currentProspects = allProspects.filter((p) => inCurrentPeriod(p.created_at)).length;
  const previousProspects = allProspects.filter((p) => inPreviousPeriod(p.created_at)).length;

  const currentClients = allClients.filter((c) => inCurrentPeriod(c.created_at)).length;
  const previousClients = allClients.filter((c) => inPreviousPeriod(c.created_at)).length;

  const currentRequests = allRequests.filter((r) => inCurrentPeriod(r.responded_at)).length;
  const previousRequests = allRequests.filter((r) => inPreviousPeriod(r.responded_at)).length;

  const kpis: Kpi[] = [
    { label: "Revenue", value: currentRevenue, previousValue: previousRevenue, format: "money" },
    { label: "New prospects", value: currentProspects, previousValue: previousProspects, format: "count" },
    { label: "New clients", value: currentClients, previousValue: previousClients, format: "count" },
    { label: "Requests handled", value: currentRequests, previousValue: previousRequests, format: "count" },
  ];

  const bucketDays = bucketSizeDays(range);
  const revenueSeries = bucketSeries(allInvoices, (i) => i.paid_at, (i) => i.amount_pence / 100, periodStart, now, bucketDays);
  const prospectsSeries = bucketSeries(allProspects, (p) => p.created_at, () => 1, periodStart, now, bucketDays);

  // 3 buckets ahead in whatever unit this range already uses — days for
  // 7d/30d, weeks for 90d, months for 12m — so "projected" always means
  // roughly the same portion of new horizon added to the chart, not a
  // fixed day count that would be 3 months on a 7-day chart. 7d itself is
  // excluded: a week is too short a real history to trust a trend line
  // drawn from it (see projectSeries()'s own MIN_POINTS_FOR_FORECAST).
  const forecastPeriods = range === "7d" ? 0 : 3;
  const revenueForecast = projectSeries(revenueSeries, now, bucketDays, forecastPeriods);
  const prospectsForecast = projectSeries(prospectsSeries, now, bucketDays, forecastPeriods);

  return { range, periodStart, previousPeriodStart, kpis, revenueSeries, revenueForecast, prospectsSeries, prospectsForecast };
}

export function percentChange(current: number, previous: number): { pct: number; direction: "up" | "down" | "flat" } | null {
  if (previous === 0) return current === 0 ? null : { pct: 100, direction: "up" };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
}
