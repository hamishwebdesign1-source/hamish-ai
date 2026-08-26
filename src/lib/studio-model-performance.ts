import type { SupabaseClient } from "@supabase/supabase-js";
import { getUsdGbpRate } from "@/lib/fx-rate";

// Command Centre Phase 6d — Model Performance. Reads ai_call_log
// (schema-ai-call-log.sql), which logAiCall() writes to from both of
// Studio's own Claude-backed features — see command-centre-design-
// assistant.ts and answer-clients-question.ts for exactly what counts
// as success/failure.

export type AiCallRow = {
  feature: "design_assistant" | "business_analyst";
  success: boolean;
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
};

export type ModelPerformance = {
  callCount: number;
  successRatePct: number | null;
  medianLatencyMs: number | null;
  estimatedCostUsd: number | null;
};

// Real published per-token pricing for the model both features use
// (claude-haiku-4-5) — Anthropic's own USD rates, checked 2026-08-25:
// $1.00/$5.00 per million input/output tokens. Re-check this pair
// periodically; Anthropic's pricing page is the source of truth.
//
// Computed here in USD only — this stayed USD-only for a while
// precisely because an invented FX rate would be exactly the
// fabrication the rest of this app refuses to do (this page's own real
// data, revenue and invoices, is already in £). Command Centre
// improvement #5 fixed the actual gap instead of accepting it: fx-
// rate.ts fetches a real, dated USD/GBP rate daily, and
// getModelPerformance() below converts with that real rate — see its
// own comment for why the conversion lives there, not in this pure
// function.
const INPUT_USD_PER_MILLION = 1.0;
const OUTPUT_USD_PER_MILLION = 5.0;

const LOOKBACK_DAYS = 30;

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

// Pure and exported on its own, same "testable without a Supabase
// client" reasoning as studio-analytics.ts's projectSeries() — the fetch
// wrapper below just supplies the real rows.
export function computeModelPerformance(rows: AiCallRow[]): ModelPerformance {
  if (!rows.length) return { callCount: 0, successRatePct: null, medianLatencyMs: null, estimatedCostUsd: null };

  const successRatePct = Math.round((rows.filter((r) => r.success).length / rows.length) * 100);
  const medianLatencyMs = median(rows.map((r) => r.latency_ms));

  // Cost only over calls that actually carried real token counts (a
  // call logged before this column existed, or one that errored before
  // response.usage was ever read, has null tokens) — never silently
  // treated as zero cost, which would understate the real number.
  const withTokens = rows.filter((r) => r.input_tokens !== null && r.output_tokens !== null);
  const estimatedCostUsd = withTokens.length
    ? withTokens.reduce(
        (sum, r) => sum + (r.input_tokens! / 1_000_000) * INPUT_USD_PER_MILLION + (r.output_tokens! / 1_000_000) * OUTPUT_USD_PER_MILLION,
        0
      )
    : null;

  return { callCount: rows.length, successRatePct, medianLatencyMs, estimatedCostUsd };
}

// The GBP figure and its real, dated exchange rate — kept separate from
// ModelPerformance (computeModelPerformance()'s own pure, tested return
// shape) rather than folded into it, so the £ conversion stays purely a
// concern of this async wrapper, never something a unit test for the
// pure USD maths has to account for.
export type ModelPerformanceWithCost = ModelPerformance & {
  estimatedCostGbp: number | null;
  fxRateFetchedAt: string | null;
};

export async function getModelPerformance(admin: SupabaseClient, orgId: string): Promise<ModelPerformanceWithCost> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [{ data }, fx] = await Promise.all([
    admin
      .from("ai_call_log")
      .select("feature, success, latency_ms, input_tokens, output_tokens")
      .eq("org_id", orgId)
      .gte("created_at", since),
    getUsdGbpRate(admin),
  ]);

  const performance = computeModelPerformance(data ?? []);
  const estimatedCostGbp = performance.estimatedCostUsd !== null && fx ? performance.estimatedCostUsd * fx.rate : null;

  return { ...performance, estimatedCostGbp, fxRateFetchedAt: fx?.fetchedAt ?? null };
}
