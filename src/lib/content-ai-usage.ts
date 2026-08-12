import { getSupabaseAdmin } from "@/lib/supabase";

// Content Factory MVP Phase C (docs/content-factory-plan.md) — the only
// cost-tracking table anywhere in this codebase; deliberately minimal,
// not a full billing system. Fire-and-forget insert, same shape as
// logAuditEvent — a write here should never be able to break the call
// it's metering.
export async function recordContentUsage(params: {
  ideaId?: string;
  videoId?: string;
  stage: "idea_discovery" | "idea_research" | "script_generation" | "video_prompt" | "caption_generation" | "viewmax_video";
  provider: "anthropic" | "viewmax";
  units: number;
  unitType: "tokens" | "credits";
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("content_ai_usage").insert({
    idea_id: params.ideaId ?? null,
    video_id: params.videoId ?? null,
    stage: params.stage,
    provider: params.provider,
    units: params.units,
    unit_type: params.unitType,
    metadata: params.metadata ?? null,
  });

  if (error) console.error(`Failed to record content usage (${params.stage}):`, error);
}
