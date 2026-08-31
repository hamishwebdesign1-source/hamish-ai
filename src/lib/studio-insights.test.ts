import { describe, it, expect } from "vitest";
import { generateInsights } from "./studio-insights";
import type { AnalyticsData } from "./studio-analytics";
import type { ClientHealth } from "./client-health";

// Command Centre Phase 6b — the impact score exists to change ranking,
// not just decorate the card, so what these tests actually prove is
// ordering: the highest real-impact insight comes first, ties keep their
// original order, and nothing here is fabricated by the ranking itself
// (every insight generateInsights() can produce, it can still produce —
// this only ever reorders that same list).

function analytics(overrides: Partial<AnalyticsData> = {}): AnalyticsData {
  return {
    range: "30d",
    periodStart: new Date("2026-07-26T00:00:00Z"),
    previousPeriodStart: new Date("2026-06-26T00:00:00Z"),
    kpis: [],
    revenueSeries: [],
    revenueForecast: [],
    prospectsSeries: [],
    prospectsForecast: [],
    ...overrides,
  };
}

const HEALTHY: ClientHealth = { healthScore: 90, components: [] };

describe("generateInsights impact ranking", () => {
  it("ranks a striking KPI swing above a milder one", () => {
    const data = analytics({
      kpis: [
        { label: "Revenue", value: 1000, previousValue: 800, format: "money" }, // +25% -> medium
        { label: "New prospects", value: 100, previousValue: 20, format: "count" }, // +400% -> high
      ],
    });

    const insights = generateInsights(data, HEALTHY, 0);
    expect(insights[0].id).toBe("kpi-New prospects");
    expect(insights[0].impact).toBe("high");
    expect(insights[1].id).toBe("kpi-Revenue");
    expect(insights[1].impact).toBe("medium");
  });

  it("treats a genuinely failing health component as higher impact than a soft one", () => {
    const health: ClientHealth = {
      healthScore: 50,
      components: [
        { label: "Site uptime", value: 55 }, // < 60, >= 40 -> medium
        { label: "On-time payment", value: 20 }, // < 40 -> high
      ],
    };
    const insights = generateInsights(analytics(), health, 0);
    expect(insights[0].id).toBe("health-On-time payment");
    expect(insights[0].impact).toBe("high");
    expect(insights[1].id).toBe("health-Site uptime");
    expect(insights[1].impact).toBe("medium");
  });

  it("keeps stable order between two insights that tie on impact", () => {
    const data = analytics({
      kpis: [
        { label: "New prospects", value: 130, previousValue: 100, format: "count" }, // +30% -> medium
        { label: "New clients", value: 13, previousValue: 10, format: "count" }, // +30% -> medium
      ],
    });
    const insights = generateInsights(data, HEALTHY, 0);
    expect(insights.map((i) => i.id)).toEqual(["kpi-New prospects", "kpi-New clients"]);
  });

  it("gives overdue projects high impact only once there are several", () => {
    const one = generateInsights(analytics(), HEALTHY, 1);
    expect(one.find((i) => i.id === "overdue-projects")?.impact).toBe("medium");

    const many = generateInsights(analytics(), HEALTHY, 3);
    expect(many.find((i) => i.id === "overdue-projects")?.impact).toBe("high");
  });

  it("never invents an insight the existing rules wouldn't already produce", () => {
    const insights = generateInsights(analytics(), HEALTHY, 0);
    expect(insights).toEqual([]);
  });
});
