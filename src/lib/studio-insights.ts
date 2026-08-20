import type { AnalyticsData } from "@/lib/studio-analytics";
import { percentChange } from "@/lib/studio-analytics";
import type { ClientHealth } from "@/lib/client-health";

// Command Centre Phase 3 — the "AI Insight Feed" (§13). Deliberately
// rule-based, not LLM-generated: every insight here is a real delta or
// threshold already computed by Phase 2's analytics/health logic,
// converted into a structured card with the exact numbers as evidence.
// A generative model asked to "find insights" can improvise a pattern
// that isn't really there; a rule checking "did this real number cross
// this real threshold" cannot. The conversational "why did this happen"
// side lives in the AI Business Analyst instead (answer-clients-question.ts),
// which is the right tool for open-ended reasoning — this one is for
// surfacing what's true without being asked.

export type InsightCategory = "opportunity" | "warning" | "recommendation" | "anomaly";
export type Insight = {
  id: string;
  category: InsightCategory;
  headline: string;
  evidence: string;
  action?: { label: string; href: string };
};

// Below this, a swing is noise (small absolute counts naturally swing
// wildly period to period) — not worth surfacing as if it were a trend.
const MEANINGFUL_PCT = 15;

const KPI_LINKS: Record<string, string> = {
  Revenue: "/studio/analytics",
  "New prospects": "/studio/prospects",
  "New clients": "/studio/clients",
  "Requests handled": "/studio/requests",
};

export function generateInsights(analytics: AnalyticsData, agencyHealth: ClientHealth, overdueProjectCount: number): Insight[] {
  const insights: Insight[] = [];

  for (const kpi of analytics.kpis) {
    const change = percentChange(kpi.value, kpi.previousValue);
    if (!change || change.pct < MEANINGFUL_PCT || change.direction === "flat") continue;

    const formatted = kpi.format === "money" ? `£${(kpi.value / 100).toLocaleString("en-GB")}` : kpi.value.toLocaleString("en-GB");
    const isGoodDirection = change.direction === "up"; // every current KPI (revenue, prospects, clients, requests handled) is better when it's up
    insights.push({
      id: `kpi-${kpi.label}`,
      category: isGoodDirection ? "opportunity" : "warning",
      headline: `${kpi.label} ${isGoodDirection ? "up" : "down"} ${change.pct}% this period`,
      evidence: `${formatted} vs ${kpi.format === "money" ? `£${(kpi.previousValue / 100).toLocaleString("en-GB")}` : kpi.previousValue.toLocaleString("en-GB")} in the previous period.`,
      action: KPI_LINKS[kpi.label] ? { label: `View ${kpi.label.toLowerCase()}`, href: KPI_LINKS[kpi.label] } : undefined,
    });
  }

  // Health components below a real, meaningful concern threshold — not
  // "anything under 100%" (that would fire constantly and mean nothing).
  // Pipeline conversion deliberately excluded: found live-testing this —
  // the other four components (uptime, payment timeliness, delivery,
  // responsiveness) genuinely should be high, so "below 60%" is a fair
  // concern signal for them. Conversion rate has no such universal
  // benchmark (a 50% prospect-to-client rate is strong for most
  // agencies), so applying the same threshold to it produced a real,
  // wrong warning on a healthy number — a misleading judgment on real
  // data is still a fabrication, even though the number itself was real.
  for (const component of agencyHealth.components) {
    if (component.label === "Pipeline conversion") continue;
    if (component.value < 60) {
      insights.push({
        id: `health-${component.label}`,
        category: "warning",
        headline: `${component.label} is at ${component.value}%`,
        evidence: "Below the level worth a look — see Business Health on the Command Centre for the full breakdown.",
      });
    }
  }

  if (overdueProjectCount > 0) {
    insights.push({
      id: "overdue-projects",
      category: "warning",
      headline: `${overdueProjectCount} project${overdueProjectCount === 1 ? "" : "s"} past its target date`,
      evidence: "See Projects for which ones and by how long.",
      action: { label: "View projects", href: "/studio/projects" },
    });
  }

  // A genuine recommendation, not just a delta — the platform's own
  // clearest opportunity: unconverted, real-value pipeline sitting idle.
  const pipelineKpi = analytics.kpis.find((k) => k.label === "New prospects");
  if (pipelineKpi && pipelineKpi.value > 0 && analytics.kpis.find((k) => k.label === "New clients")?.value === 0) {
    insights.push({
      id: "no-conversions",
      category: "recommendation",
      headline: `${pipelineKpi.value} new prospect${pipelineKpi.value === 1 ? "" : "s"} this period, no conversions yet`,
      evidence: "Worth reviewing whether any are ready to contact or convert.",
      action: { label: "View prospects", href: "/studio/prospects" },
    });
  }

  return insights;
}
