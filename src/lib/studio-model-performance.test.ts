import { describe, it, expect } from "vitest";
import { computeModelPerformance, type AiCallRow } from "./studio-model-performance";

function row(overrides: Partial<AiCallRow> = {}): AiCallRow {
  return { feature: "design_assistant", success: true, latency_ms: 1000, input_tokens: 500, output_tokens: 200, ...overrides };
}

describe("computeModelPerformance", () => {
  it("returns all-null defaults, not zero, when there are no calls yet", () => {
    expect(computeModelPerformance([])).toEqual({ callCount: 0, successRatePct: null, medianLatencyMs: null, estimatedCostUsd: null });
  });

  it("computes a real success rate from mixed outcomes", () => {
    const result = computeModelPerformance([row({ success: true }), row({ success: true }), row({ success: true }), row({ success: false })]);
    expect(result.callCount).toBe(4);
    expect(result.successRatePct).toBe(75);
  });

  it("computes the median latency for an odd number of calls", () => {
    const result = computeModelPerformance([row({ latency_ms: 100 }), row({ latency_ms: 900 }), row({ latency_ms: 500 })]);
    expect(result.medianLatencyMs).toBe(500);
  });

  it("computes the median latency for an even number of calls", () => {
    const result = computeModelPerformance([row({ latency_ms: 100 }), row({ latency_ms: 200 }), row({ latency_ms: 300 }), row({ latency_ms: 400 })]);
    expect(result.medianLatencyMs).toBe(250);
  });

  it("estimates real cost from real published Haiku 4.5 rates", () => {
    // 1,000,000 input tokens @ $1.00/M + 1,000,000 output tokens @ $5.00/M = $6.00
    const result = computeModelPerformance([row({ input_tokens: 1_000_000, output_tokens: 1_000_000 })]);
    expect(result.estimatedCostUsd).toBeCloseTo(6.0, 5);
  });

  it("sums cost across multiple calls rather than only the last one", () => {
    const result = computeModelPerformance([
      row({ input_tokens: 500_000, output_tokens: 100_000 }),
      row({ input_tokens: 500_000, output_tokens: 100_000 }),
    ]);
    // per call: 0.5*1 + 0.1*5 = 1.0 -> two calls = 2.0
    expect(result.estimatedCostUsd).toBeCloseTo(2.0, 5);
  });

  it("returns null cost rather than treating missing token counts as free", () => {
    const result = computeModelPerformance([row({ input_tokens: null, output_tokens: null })]);
    expect(result.estimatedCostUsd).toBeNull();
  });

  it("costs only the calls that carried real tokens, not the whole batch", () => {
    const result = computeModelPerformance([row({ input_tokens: null, output_tokens: null }), row({ input_tokens: 1_000_000, output_tokens: 0 })]);
    expect(result.estimatedCostUsd).toBeCloseTo(1.0, 5);
  });
});
