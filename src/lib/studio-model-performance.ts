import type { SupabaseClient } from "@supabase/supabase-js";
import { getUsdGbpRate } from "@/lib/fx-rate";

// Command Centre Phase 6d — Model Performance. Reads ai_call_log
// (schema-ai-call-log.sql), which logAiCall() writes to from both of
// Studio's own Claude-backed features — see command-centre-design-
// assistant.ts and answer-clients-question.ts for exactly what counts
// as success/failure.

// Studio big-ticket ("Model Performance completeness") — this widget's
// own schema comment (schema-ai-call-log.sql) flagged it explicitly:
// "Studio's own two Claude-backed features today" was already dated the
// moment usage-limits.ts grew to 10 real metered AI actions, only 2 of
// which ever fed this table. Widened to the real full set — every
// Claude-backed Studio action, not just the two that happened to ship
// with logAiCall() built in.
export type AiFeature =
  | "design_assistant"
  | "business_analyst"
  | "studio_assistant"
  | "prospect_research"
  | "sales_kit"
  | "website_mockup"
  | "icp_builder"
  | "request_triage"
  | "website_brief"
  | "website_build_phase"
  | "website_troubleshooting"
  | "knowledge_import";

export const FEATURE_LABELS: Record<AiFeature, string> = {
  design_assistant: "AI Design Assistant",
  business_analyst: "AI Business Analyst",
  studio_assistant: "Studio AI Assistant",
  prospect_research: "Prospect research",
  sales_kit: "Sales kit generation",
  website_mockup: "Website mockups",
  icp_builder: "ICP builder",
  request_triage: "Request triage",
  website_brief: "Website briefs",
  website_build_phase: "Website build phases",
  website_troubleshooting: "Website troubleshooting",
  knowledge_import: "Knowledge base import",
};

export type AiCallRow = {
  feature: AiFeature;
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
export type ModelPerformanceWithGbp = ModelPerformance & { estimatedCostGbp: number | null };

function withGbp(performance: ModelPerformance, rate: number | null): ModelPerformanceWithGbp {
  return { ...performance, estimatedCostGbp: performance.estimatedCostUsd !== null && rate !== null ? performance.estimatedCostUsd * rate : null };
}

export type ModelPerformanceWithCost = ModelPerformanceWithGbp & {
  fxRateFetchedAt: string | null;
  // Studio improvement — ai_call_log.feature already distinguishes the
  // two Claude-backed features (Design Assistant, Business Analyst), but
  // the aggregate above always merged them into one number. Same
  // computeModelPerformance() over each feature's own rows, not a new
  // computation — a real breakdown, not a second engine.
  byFeature: Record<AiFeature, ModelPerformanceWithGbp>;
};

// Studio big-ticket ("Model Performance completeness") — the "no Supabase
// admin client configured" fallback (page.tsx) needs the full real
// shape, not a hand-maintained subset that drifts every time AiFeature
// grows. Built generically over FEATURE_LABELS's own keys, same
// reasoning getModelPerformance()'s own byFeature construction below
// already applies.
export function emptyModelPerformance(): ModelPerformanceWithCost {
  const empty: ModelPerformanceWithGbp = { callCount: 0, successRatePct: null, medianLatencyMs: null, estimatedCostUsd: null, estimatedCostGbp: null };
  const byFeature = Object.fromEntries((Object.keys(FEATURE_LABELS) as AiFeature[]).map((feature) => [feature, empty])) as Record<
    AiFeature,
    ModelPerformanceWithGbp
  >;
  return { ...empty, fxRateFetchedAt: null, byFeature };
}

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

  const rows = data ?? [];
  const rate = fx?.rate ?? null;
  const performance = withGbp(computeModelPerformance(rows), rate);

  // Built generically over every real feature rather than one hardcoded
  // key per feature (the original 2-feature version's own shape) — a
  // new AiFeature only ever needs adding to the type/FEATURE_LABELS
  // above, never a third line here.
  const byFeature = Object.fromEntries(
    (Object.keys(FEATURE_LABELS) as AiFeature[]).map((feature) => [feature, withGbp(computeModelPerformance(rows.filter((r) => r.feature === feature)), rate)])
  ) as Record<AiFeature, ModelPerformanceWithGbp>;

  return { ...performance, fxRateFetchedAt: fx?.fetchedAt ?? null, byFeature };
}
