import { getSupabaseAdmin } from "@/lib/supabase";

// Command Centre Phase 6d — backs the Model Performance card. See
// schema-ai-call-log.sql for why this is a separate table from
// usage_events rather than new columns on it.

export type AiCallFeature = "design_assistant" | "business_analyst";

// Fire-and-forget, same posture as trackServerEvent() and
// recordUsageEvent(): logging a call must never be the reason the real
// feature the user is waiting on fails or errors. Called once per real
// attempt (an early "not configured"/validation return before any
// Anthropic call happens isn't a call attempt at all, so callers don't
// log that path — see command-centre-design-assistant.ts and
// answer-clients-question.ts for exactly where each logs from).
export async function logAiCall(
  orgId: string,
  feature: AiCallFeature,
  data: { success: boolean; latencyMs: number; inputTokens?: number; outputTokens?: number }
) {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const { error } = await admin.from("ai_call_log").insert({
    org_id: orgId,
    feature,
    success: data.success,
    latency_ms: data.latencyMs,
    input_tokens: data.inputTokens ?? null,
    output_tokens: data.outputTokens ?? null,
  });
  if (error) console.error(`Failed to log AI call (${feature}):`, error);
}
