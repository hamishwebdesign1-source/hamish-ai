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
// How much this insight is worth acting on — separate from `category`,
// which says what kind of thing it is (good news vs. bad news vs. a
// suggestion), not how urgent it is. A "high" opportunity and a "high"
// warning are both worth seeing before a "low" one of either.
export type InsightImpact = "high" | "medium" | "low";
export type Insight = {
  id: string;
  category: InsightCategory;
  impact: InsightImpact;
  headline: string;
  evidence: string;
  action?: { label: string; href: string };
};

// Below this, a swing is noise (small absolute counts naturally swing
// wildly period to period) — not worth surfacing as if it were a trend.
const MEANINGFUL_PCT = 15;

const IMPACT_WEIGHT: Record<InsightImpact, number> = { high: 3, medium: 2, low: 1 };

// Thresholds below are the same kind of deterministic rule as
// MEANINGFUL_PCT itself — a real number crossing a real line, never a
// model's judgment call. Chosen so "high" means genuinely striking
// (roughly a 3x-or-more swing in KPI terms, or a health component that's
// actually failing rather than just soft) rather than everything real
// insight generation surfaces claiming to be urgent.
function kpiImpact(pct: number): InsightImpact {
  if (pct >= 40) return "high";
  if (pct >= 25) return "medium";
  return "low";
}
function healthImpact(value: number): InsightImpact {
  return value < 40 ? "high" : "medium";
}
function overdueImpact(count: number): InsightImpact {
  return count >= 3 ? "high" : "medium";
}

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
      impact: kpiImpact(change.pct),
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
        impact: healthImpact(component.value),
        headline: `${component.label} is at ${component.value}%`,
        evidence: "Below the level worth a look — see Business Health on the Command Centre for the full breakdown.",
      });
    }
  }

  if (overdueProjectCount > 0) {
    insights.push({
      id: "overdue-projects",
      category: "warning",
      impact: overdueImpact(overdueProjectCount),
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
      impact: "medium",
      headline: `${pipelineKpi.value} new prospect${pipelineKpi.value === 1 ? "" : "s"} this period, no conversions yet`,
      evidence: "Worth reviewing whether any are ready to contact or convert.",
      action: { label: "View prospects", href: "/studio/prospects" },
    });
  }

  // Next Best Action (Command Centre Phase 6b) — the feed itself stays in
  // the order each rule happens to run in above; this is the one place
  // that actually re-ranks it, highest real impact first, so the thing
  // most worth doing something about is never buried under three milder
  // ones that just happened to be computed earlier. Array#sort is stable
  // (guaranteed since ES2019), so insights that tie on impact keep their
  // original relative order rather than shuffling on every render.
  insights.sort((a, b) => IMPACT_WEIGHT[b.impact] - IMPACT_WEIGHT[a.impact]);

  return insights;
}
