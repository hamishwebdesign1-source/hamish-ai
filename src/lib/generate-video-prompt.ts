import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { logAuditEvent } from "@/lib/audit-log";
import { recordContentUsage } from "@/lib/content-ai-usage";
import type { ScriptBeats, SceneBeat } from "@/lib/generate-content-scripts";

// Content Factory MVP Phase B (docs/content-factory-plan.md) — the video
// prompt engine (brief §7). Does not just hand the script to ViewMax: one
// small forced-tool Haiku call synthesises the selected script's hook,
// beats, and scene_breakdown into a single dense generation prompt
// covering scene structure, visual style, camera movement, composition,
// lighting, characters, environment, transitions, pacing, and on-screen
// text — kept as a separate call from generate-content-scripts.ts for the
// same schema-size/reliability reason research-lead.ts splits its two
// large forced calls (a script-writing call and a visual-direction call
// are different jobs, and Haiku is more reliable one focused task at a
// time). Aspect ratio and duration are computed deterministically, not
// asked of the model — every platform this pipeline targets (Shorts/
// TikTok/Reels) is vertical 9:16, and duration is the sum of the
// script's own scene durations, clamped to MIN/MAX_DURATION_S.
//
// The clamp exists because of a real cost-cliff finding (2026-08-12,
// see docs/content-factory-plan.md's cost section): ViewMax's real model
// catalog has a hard tier jump around 15s — most affordable models offer
// a duration at or near 12s, then skip straight to 30s, so a video
// landing at even 16-25s costs roughly double what a 12s-or-under video
// does, for barely any extra content. generate-content-scripts.ts's
// prompt already asks for <=12s scenes, but this clamp is the backstop
// in case a script variant still comes back longer.
//
// ViewMax's documented prompt limit is 2000 characters (see their MCP
// docs) — enforced defensively here with a hard truncate, same "final
// sanitizer before anything reaches storage" convention as
// research-lead.ts's sanitizeSalesStrategy.

const MAX_PROMPT_CHARS = 2000;
const ASPECT_RATIO = "9:16"; // every MVP platform target (shorts/tiktok/reels) is vertical
const MIN_DURATION_S = 8;
const MAX_DURATION_S = 12; // the real cost-cliff boundary — see module header

export type VideoPromptSpec = {
  prompt: string;
  style_notes: string;
  duration_s: number;
  aspect_ratio: string;
  resolution: string; // a sensible default; revalidated against ViewMax's live model catalog at submission time in Phase C, never assumed fixed
};

const VIDEO_PROMPT_TOOL: Anthropic.Tool = {
  name: "submit_video_prompt",
  description: "Submit the ViewMax-ready video generation prompt for this script.",
  input_schema: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description:
          "A single dense natural-language generation prompt (under 2000 characters) describing the video scene-by-scene: visual style, camera movement, composition, lighting, characters/subjects, environment, transitions between scenes, pacing, and any on-screen text overlays. Written as one flowing prompt a text-to-video model can act on directly, not a bullet list.",
      },
      style_notes: {
        type: "string",
        description: "A short (1-2 sentence) human-readable summary of the visual style/mood, for the review screen — not sent to ViewMax.",
      },
    },
    required: ["prompt", "style_notes"],
  },
};

function buildSystemPrompt(script: { hook: string; beats: ScriptBeats; scene_breakdown: SceneBeat[]; style: string }): string {
  const scenesText = script.scene_breakdown
    .sort((a, b) => a.order - b.order)
    .map((s) => `${s.order}. [${s.beat}, ~${s.duration_s}s] ${s.visual_description}${s.on_screen_text ? ` — on-screen text: "${s.on_screen_text}"` : ""}`)
    .join("\n");

  return `You are a video-generation prompt engineer, turning a finished short-form video script into one detailed generation prompt for an AI video model (ViewMax). This is NOT the script text itself — it's visual direction for the model that will actually generate the footage.

Script style: ${script.style}
Hook (spoken): ${script.hook}
Setup: ${script.beats.setup}
Escalation: ${script.beats.escalation}
Payoff: ${script.beats.payoff}
Ending: ${script.beats.ending}

Scene-by-scene breakdown already planned:
${scenesText}

Write ONE dense, continuous generation prompt (well under 2000 characters) that a text-to-video model can act on directly — cover visual style (e.g. clean vertical mobile-first, realistic vs. stylised), camera movement and composition per scene, lighting/mood, any characters or subjects and their consistency across scenes, environment/setting, how scenes transition into each other, overall pacing, and where on-screen text appears. Do not restate the spoken script word-for-word — describe what the CAMERA and SCREEN show. Be concrete and visual, not abstract.`;
}

function truncatePrompt(prompt: string): string {
  return prompt.length > MAX_PROMPT_CHARS ? `${prompt.slice(0, MAX_PROMPT_CHARS - 1).trimEnd()}…` : prompt;
}

export async function generateVideoPrompt(scriptId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: script, error: scriptError } = await supabase
    .from("content_scripts")
    .select("idea_id, style, hook, beats, scene_breakdown")
    .eq("id", scriptId)
    .single();
  if (scriptError || !script) return { error: "Script not found." as const };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const sceneBreakdown = (script.scene_breakdown ?? []) as SceneBeat[];
  const rawDurationS = Math.round(sceneBreakdown.reduce((sum, s) => sum + (s.duration_s || 0), 0));
  const durationS = Math.min(MAX_DURATION_S, Math.max(MIN_DURATION_S, rawDurationS));

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 900,
      system: buildSystemPrompt(script as { hook: string; beats: ScriptBeats; scene_breakdown: SceneBeat[]; style: string }),
      tools: [VIDEO_PROMPT_TOOL],
      tool_choice: { type: "tool", name: "submit_video_prompt" },
      messages: [{ role: "user", content: "Write the video generation prompt and submit it." }],
    });

    await recordContentUsage({
      ideaId: script.idea_id,
      stage: "video_prompt",
      provider: "anthropic",
      units: response.usage.input_tokens + response.usage.output_tokens,
      unitType: "tokens",
    });

    const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    if (!toolUse) return { error: "The AI did not return a video prompt." as const };

    const raw = toolUse.input as { prompt: string; style_notes: string };
    const videoPrompt: VideoPromptSpec = {
      prompt: truncatePrompt(stripMarkdownEmphasis(raw.prompt)),
      style_notes: stripMarkdownEmphasis(raw.style_notes),
      duration_s: durationS,
      aspect_ratio: ASPECT_RATIO,
      resolution: "1080p",
    };
    const generatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("content_scripts")
      .update({ video_prompt: videoPrompt, prompt_generated_at: generatedAt })
      .eq("id", scriptId);
    if (updateError) {
      console.error("Failed to save video prompt:", updateError);
      return { error: "Video prompt generated but failed to save." as const };
    }

    await supabase.from("content_ideas").update({ status: "ready_for_video" }).eq("id", script.idea_id);

    await logAuditEvent({
      actor: "system",
      actorType: "system",
      action: "content.video_prompt_generated",
      targetType: "content_idea",
      targetId: script.idea_id,
      metadata: { script_id: scriptId, duration_s: durationS },
    });

    return { videoPrompt, generatedAt };
  } catch (error) {
    console.error(`Failed to generate video prompt for script ${scriptId}:`, error);
    return { error: "The prompt-engineering agent is temporarily unavailable." as const };
  }
}
