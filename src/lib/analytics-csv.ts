import type { AnalyticsData } from "@/lib/studio-analytics";
import { RANGE_LABELS } from "@/lib/studio-analytics";

// Studio improvement — the Analytics page had no export at all; every
// number here is already real (studio-analytics.ts's own comment on why),
// this just lets a tenant take the exact same numbers the page renders
// somewhere else (a spreadsheet, an accountant, a board deck) instead of
// re-typing them by hand. Pure and exported on its own, same "testable
// without a browser" reasoning as studio-analytics.ts's own projectSeries()
// — the download itself (Blob/URL.createObjectURL) is a thin wrapper in
// analytics-panel.tsx around this string.

function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function row(fields: (string | number)[]): string {
  return fields.map((f) => escapeCsvField(String(f))).join(",") + "\r\n";
}

export function buildAnalyticsCsv(data: AnalyticsData): string {
  let csv = row(["Studio Analytics export", RANGE_LABELS[data.range]]);
  csv += "\r\n";

  csv += row(["KPI", "This period", "Previous period"]);
  for (const kpi of data.kpis) {
    const value = kpi.format === "money" ? (kpi.value / 100).toFixed(2) : kpi.value;
    const previousValue = kpi.format === "money" ? (kpi.previousValue / 100).toFixed(2) : kpi.previousValue;
    csv += row([kpi.label, value, previousValue]);
  }
  csv += "\r\n";

  csv += row(["Revenue by period (£)"]);
  csv += row(["Period", "Revenue"]);
  for (const point of data.revenueSeries) csv += row([point.label, point.value]);
  csv += "\r\n";

  csv += row(["New prospects by period"]);
  csv += row(["Period", "Prospects"]);
  for (const point of data.prospectsSeries) csv += row([point.label, point.value]);

  return csv;
}
