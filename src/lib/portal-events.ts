import type { SupabaseClient } from "@supabase/supabase-js";

// The in-app notification bell's event feed and the Insights page's
// "Recent activity" feed are the same underlying idea — real automation
// events, chronologically sorted — so the transform lives here once and
// both call sites (portal-insights-data.ts's full computation, and the
// bell's lean fetch below) share it rather than drifting apart.

export type PortalEvent = { id: string; label: string; detail: string; at: string };

type RequestRow = { id: string; auto_sent: boolean; responded_at: string | null };
type SiteCheckRow = { checked_at: string; uptime_ok: boolean | null };
type InvoiceRow = { amount_pence: number; paid_at: string | null; created_at: string };
type MonthlyReportRow = { id: string; period_start: string; created_at: string };

// Never `new Date(dateOnlyStr)` directly — a date-only ISO string parses
// as UTC midnight, and a viewer in a timezone behind UTC would see it
// roll back to the previous day/month once formatted in local time (the
// same class of bug caught live-testing monthly-report.ts's own period
// calculation). Building a local Date from the parsed components instead
// never round-trips through UTC. Shared here so this reporting page and
// monthly-reports-list.tsx don't each reinvent it slightly differently.
export function monthLabelFromDateStr(dateStr: string) {
  const [year, month] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function buildAutomationEvents(
  requests: RequestRow[],
  siteChecks: SiteCheckRow[],
  invoices: InvoiceRow[],
  limit = 12,
  monthlyReports: MonthlyReportRow[] = []
): PortalEvent[] {
  const events: PortalEvent[] = [];

  monthlyReports.forEach((r) =>
    events.push({
      id: `report-${r.id}`,
      label: "Monthly report ready",
      detail: monthLabelFromDateStr(r.period_start),
      at: r.created_at,
    })
  );

  requests
    .filter((r) => r.auto_sent && r.responded_at)
    .forEach((r) =>
      events.push({
        id: `auto-${r.id}`,
        label: "AI auto-replied to your request",
        detail: "Covered by your plan — no wait for a human",
        at: r.responded_at!,
      })
    );

  siteChecks
    .slice(0, 8)
    .forEach((c, i) =>
      events.push({
        id: `check-${i}-${c.checked_at}`,
        label: "Site health check ran",
        detail: c.uptime_ok === false ? "Issue detected" : "All clear",
        at: c.checked_at,
      })
    );

  invoices
    .filter((i) => i.paid_at)
    .forEach((i) =>
      events.push({
        id: `paid-${i.created_at}`,
        label: "Payment received",
        detail: `£${(i.amount_pence / 100).toFixed(2)}`,
        at: i.paid_at!,
      })
    );

  invoices.forEach((i) =>
    events.push({
      id: `created-${i.created_at}`,
      label: "Invoice generated",
      detail: `£${(i.amount_pence / 100).toFixed(2)}`,
      at: i.created_at,
    })
  );

  return events.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit);
}

// Deliberately lean: unlike buildPortalInsights (which pulls everything
// needed for the whole Insights page), this only selects the handful of
// columns buildAutomationEvents actually reads, since it runs on every
// portal page load to feed the header's notification bell, not once per
// Insights visit.
export async function getRecentPortalEvents(supabase: SupabaseClient, clientId: string, limit = 8): Promise<PortalEvent[]> {
  const [{ data: requests }, { data: siteChecks }, { data: invoices }, { data: monthlyReports }] = await Promise.all([
    supabase
      .from("requests")
      .select("id, auto_sent, responded_at")
      .eq("client_id", clientId)
      .eq("auto_sent", true)
      .not("responded_at", "is", null)
      .order("responded_at", { ascending: false })
      .limit(limit),
    supabase.from("site_checks").select("checked_at, uptime_ok").eq("client_id", clientId).order("checked_at", { ascending: false }).limit(limit),
    supabase.from("invoices").select("amount_pence, paid_at, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(limit),
    supabase.from("monthly_reports").select("id, period_start, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(limit),
  ]);

  return buildAutomationEvents(requests ?? [], siteChecks ?? [], invoices ?? [], limit, monthlyReports ?? []);
}
