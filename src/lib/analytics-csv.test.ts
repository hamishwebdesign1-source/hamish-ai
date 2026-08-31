import { describe, it, expect } from "vitest";
import { buildAnalyticsCsv } from "./analytics-csv";
import type { AnalyticsData } from "./studio-analytics";

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

describe("buildAnalyticsCsv", () => {
  it("converts a money KPI from pence to pounds", () => {
    const csv = buildAnalyticsCsv(analytics({ kpis: [{ label: "Revenue", value: 150000, previousValue: 100000, format: "money" }] }));
    expect(csv).toContain("Revenue,1500.00,1000.00");
  });

  it("leaves a count KPI as a plain number", () => {
    const csv = buildAnalyticsCsv(analytics({ kpis: [{ label: "New prospects", value: 12, previousValue: 8, format: "count" }] }));
    expect(csv).toContain("New prospects,12,8");
  });

  it("includes every point of both series, in order", () => {
    const csv = buildAnalyticsCsv(
      analytics({
        revenueSeries: [{ label: "1 Aug", value: 100 }, { label: "2 Aug", value: 200 }],
        prospectsSeries: [{ label: "1 Aug", value: 3 }],
      })
    );
    expect(csv).toContain("1 Aug,100");
    expect(csv).toContain("2 Aug,200");
    expect(csv).toContain("1 Aug,3");
  });

  it("quotes a field containing a comma rather than letting it split into two columns", () => {
    const csv = buildAnalyticsCsv(analytics({ revenueSeries: [{ label: "Jan, 2026", value: 5 }] }));
    expect(csv).toContain('"Jan, 2026",5');
  });
});
