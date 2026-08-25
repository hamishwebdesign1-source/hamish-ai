import { describe, it, expect } from "vitest";
import { projectSeries, type ChartPoint } from "./studio-analytics";

// Command Centre Phase 6b — the forecast card. What actually matters here
// isn't the regression maths (that's textbook OLS) but the guards around
// it: a projection this app shows a tenant has to be honest about when it
// doesn't have enough real signal to draw one at all, not paper over thin
// data with a confident-looking line.

const LAST_BUCKET = new Date("2026-08-25T00:00:00Z");

describe("projectSeries", () => {
  it("returns the series unchanged, with no forecast points, when periodsAhead is 0", () => {
    const series: ChartPoint[] = [
      { label: "a", value: 10 },
      { label: "b", value: 20 },
      { label: "c", value: 30 },
      { label: "d", value: 40 },
    ];
    const result = projectSeries(series, LAST_BUCKET, 1, 0);
    expect(result).toEqual(series.map((p) => ({ label: p.label, value: p.value })));
    expect(result.every((p) => p.forecast === undefined)).toBe(true);
  });

  it("refuses to project from fewer than 4 real points", () => {
    const series: ChartPoint[] = [
      { label: "a", value: 10 },
      { label: "b", value: 20 },
      { label: "c", value: 30 },
    ];
    const result = projectSeries(series, LAST_BUCKET, 1, 3);
    expect(result).toHaveLength(3);
    expect(result.every((p) => p.forecast === undefined)).toBe(true);
  });

  it("refuses to project from an all-zero series", () => {
    const series: ChartPoint[] = [
      { label: "a", value: 0 },
      { label: "b", value: 0 },
      { label: "c", value: 0 },
      { label: "d", value: 0 },
    ];
    const result = projectSeries(series, LAST_BUCKET, 1, 3);
    expect(result).toHaveLength(4);
    expect(result.every((p) => p.forecast === undefined)).toBe(true);
  });

  it("extends a clean upward trend and mirrors the last real value so the line connects", () => {
    const series: ChartPoint[] = [
      { label: "a", value: 10 },
      { label: "b", value: 20 },
      { label: "c", value: 30 },
      { label: "d", value: 40 },
    ];
    const result = projectSeries(series, LAST_BUCKET, 1, 3);
    expect(result).toHaveLength(7);

    // last real point now also carries the mirrored forecast value
    expect(result[3]).toEqual({ label: "d", value: 40, forecast: 40 });

    // three new points, values only, continuing the +10/period trend
    const future = result.slice(4);
    expect(future.every((p) => p.value === undefined)).toBe(true);
    expect(future.map((p) => p.forecast)).toEqual([50, 60, 70]);

    // real future dates, one bucket apart, not placeholder labels
    expect(future.map((p) => p.label)).toEqual([
      new Date(LAST_BUCKET.getTime() + 1 * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      new Date(LAST_BUCKET.getTime() + 2 * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      new Date(LAST_BUCKET.getTime() + 3 * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    ]);
  });

  it("never projects revenue below zero on a declining trend", () => {
    const series: ChartPoint[] = [
      { label: "a", value: 40 },
      { label: "b", value: 30 },
      { label: "c", value: 20 },
      { label: "d", value: 10 },
    ];
    const result = projectSeries(series, LAST_BUCKET, 1, 5);
    const future = result.slice(4);
    expect(future.every((p) => (p.forecast ?? 0) >= 0)).toBe(true);
    // trend keeps falling by 10/period from 0, so it clamps flat at 0
    expect(future.map((p) => p.forecast)).toEqual([0, 0, 0, 0, 0]);
  });
});
