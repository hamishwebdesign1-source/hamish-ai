import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { logAuditEvent } from "@/lib/audit-log";
import { recordContentUsage } from "@/lib/content-ai-usage";
import { listViewMaxModels, pickCheapestVideoOption, estimateOptionDurationS } from "@/lib/viewmax";
import {
  tightenNarrationToWordBudget,
  stripDisclosureScene,
  appendDisclosureScene,
  wordCount,
  AMAZON_DISCLOSURE_TEXT,
  WORDS_PER_MINUTE,
  type ScriptBeats,
  type SceneBeat,
  type PreparedVariant,
} from "@/lib/generate-content-scripts";

// ViewMax's real, confirmed hard limit on the `prompt` field of
// POST /api/v1/videos — see viewmax.ts.
const MAX_PROMPT_CHARS = 2000;
const ASPECT_RATIO = "9:16";
// If the best real ViewMax option can't deliver at least this fraction of
// the narration's natural word-count-derived length, it's treated as a
// genuine platform-ceiling shortfall worth tightening narration for —
// not just noise from picking the nearest-available duration bucket
// (e.g. a 36s narration landing on a real 30s option is normal rounding,
// not a shortfall worth an extra AI call over).
const DELIVERABLE_DURATION_MATCH_RATIO = 0.85;

export type VideoPromptSpec = {
  prompt: string;
  style_notes: string;
  duration_s: number;
  aspect_ratio: string;
  resolution: string;
};

type Script = {
  idea_id: string;
  style: string;
  hook: string;
  beats: ScriptBeats;
  full_script: string;
  scene_breakdown: SceneBeat[];
  character_consistency: string;
};

function wordsFromDurationS(durationS: number): number {
  return Math.max(1, Math.floor((durationS / 60) * WORDS_PER_MINUTE));
}

// REDESIGNED 2026-08-12 alongside generate-content-scripts.ts. The old
// version summed the model's own guessed scene durations, snapped the
// result to one of two ViewMax-pricing-driven tiers (8-12s or 20-30s),
// and asked Claude to write one dense free-text paragraph that did NOT
// carry the actual narration — ViewMax had no idea any voiceover needed
// to fit, which is exactly why real generations came back rushed,
// incomplete, or narration-free. Now: duration comes from the script's
// own word-count-derived target_duration_s (computed in
// generate-content-scripts.ts, never re-guessed here), and the prompt
// itself is a deterministic, labelled structure built directly from the
// script's real narration_segment/visual_description/on_screen_text per
// scene — the AI call here only supplies the creative direction that
// script-writing doesn't already cover (overall visual style, per-scene
// camera/lighting polish, editing/pacing notes), not a from-scratch
// rewrite of the whole prompt. That keeps this file in full control of
// the final structure and the 2000-char budget instead of hoping a
// single free-text generation both fits the template and stays on budget.

const PROMPT_POLISH_TOOL: Anthropic.Tool = {
  name: "submit_prompt_direction",
  description: "Submit the visual style, per-scene camera direction, and editing notes for this video generation prompt.",
  input_schema: {
    type: "object",
    properties: {
      visual_style: {
        type: "string",
        description: "1-2 sentences: overall look, tone, lighting, and camera style for the whole video (e.g. period-accurate, handheld documentary, muted grade).",
      },
      scene_visuals: {
        type: "array",
        description: "One tightened camera/lighting/framing direction per scene, in the same order as the scenes given — build on the scene's existing visual_description, don't replace its subject or action.",
        items: {
          type: "object",
          properties: {
            order: { type: "number" },
            visual: { type: "string", description: "One concrete shot direction (framing, camera movement, lighting) — ONE clear action, no montage." },
          },
          required: ["order", "visual"],
        },
      },
      editing_notes: {
        type: "string",
        description: "1-2 sentences on pacing/transitions/hold-time — e.g. slow deliberate cuts held on each scene, no rapid montage, gentle transitions.",
      },
    },
    required: ["visual_style", "scene_visuals", "editing_notes"],
  },
};

function buildSystemPrompt(script: Script): string {
  const scenesText = script.scene_breakdown
    .sort((a, b) => a.order - b.order)
    .map((s) => `${s.order}. [${s.beat}] "${s.narration_segment}" — current visual: ${s.visual_description}`)
    .join("\n");

  return `You are adding video-generation direction on top of an already-finished short-form video script. The narration is FINAL and must not be rewritten, shortened, or reworded by you — your job is purely visual/editing direction that will accompany it.

Idea style: ${script.style}
Full narration (final, do not alter): "${script.full_script}"
${script.character_consistency ? `Recurring character (must stay visually identical every scene): ${script.character_consistency}` : "No recurring character."}

Scenes with their narration and current visual description:
${scenesText}

Give: one overall visual_style (tone/lighting/camera for the whole piece), one tightened camera/lighting/framing direction per scene building on its existing visual (never change what's happening in the scene, only how it's shot), and brief editing_notes on pacing. Keep every field short and concrete — this is generation direction for a video model, not prose.`;
}

// Real issue found 2026-08-13 while getting a real video through the
// pipeline: this used to hard-cut mid-word ("...documentary-style archival
// photograp…", "...harsh bright sunlight cu…") — sloppy on its own, and
// feeding broken word-fragments into a video-generation prompt is a
// plausible contributor to a real "media generation failed" ViewMax
// response on this exact prompt. Now backs up to the last whole word
// before the limit.
function truncateField(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const clean = (lastSpace > maxChars * 0.5 ? cut.slice(0, lastSpace) : cut).trimEnd();
  return `${clean}…`;
}

// Deterministic assembly of the labelled template, with a cascading
// trim strategy if it comes out over ViewMax's real 2000-char limit —
// NEVER by touching the NARRATION block or any scene's narration quote
// (per the explicit "never truncate the narration" requirement); only
// the non-narration direction (per-scene quotes, then visual/editing
// text) is shortened, in that order.
function assemblePrompt(script: Script, durationS: number, direction: { visual_style: string; scene_visuals: { order: number; visual: string }[]; editing_notes: string }): string {
  const visualByOrder = new Map(direction.scene_visuals.map((v) => [v.order, v.visual]));
  const characterLine = script.character_consistency ? script.character_consistency : "No recurring characters — no consistency constraint needed.";
  const scenes = script.scene_breakdown.sort((a, b) => a.order - b.order);

  const build = (opts: { includeNarrationQuote: "full" | "short" | "none"; visualStyle: string; editingNotes: string; sceneVisuals: string[] }): string => {
    const sceneBlocks = scenes.map((s, i) => {
      const lines = [`SCENE ${s.order} (${s.duration_s}s):`];
      if (opts.includeNarrationQuote === "full") {
        lines.push(`Narration covered: "${s.narration_segment}"`);
      } else if (opts.includeNarrationQuote === "short") {
        const words = s.narration_segment.split(/\s+/);
        const short = words.length > 6 ? `${words.slice(0, 6).join(" ")}…` : s.narration_segment;
        lines.push(`Narration covered: "${short}"`);
      }
      lines.push(`Visual: ${opts.sceneVisuals[i]}`);
      lines.push(`On-screen text: "${s.on_screen_text}"`);
      return lines.join("\n");
    });

    return [
      "VOICEOVER",
      `NARRATION: "${script.full_script}"`,
      `TARGET DURATION: ${durationS} seconds`,
      `VISUAL STYLE: ${opts.visualStyle}`,
      ...sceneBlocks,
      `EDITING: ${opts.editingNotes}`,
      `CHARACTER CONSISTENCY: ${characterLine}`,
      "VOICEOVER PRIORITY: Do not rush, compress, or truncate the narration to fit the visuals. Every sentence must be spoken completely, at a natural pace, in full. If a visual sequence needs to be shortened, shorten the visual sequence — NEVER speed up, truncate, or remove words from the narration.",
    ].join("\n\n");
  };

  const baseSceneVisuals = scenes.map((s) => visualByOrder.get(s.order) ?? s.visual_description);

  // Escalating cascade: full per-scene narration quotes -> short quotes ->
  // no quotes (the NARRATION block already carries the full text, scene
  // order still ties each cue to its portion). Every step so far only
  // removes redundant narration repetition, never narration content
  // itself.
  for (const includeNarrationQuote of ["full", "short", "none"] as const) {
    const attempt = build({ includeNarrationQuote, visualStyle: direction.visual_style, editingNotes: direction.editing_notes, sceneVisuals: baseSceneVisuals });
    if (attempt.length <= MAX_PROMPT_CHARS) return attempt;
  }

  // Still over (long script, many richly-directed scenes) — proportionally
  // shrink the AI-authored creative-direction fields (visual style, editing
  // notes, and EVERY scene's visual direction), never the narration or the
  // scene/duration structure. Iterates a few times since truncateField's
  // ellipsis makes the exact resulting length only approximate.
  let visualStyle = direction.visual_style;
  let editingNotes = direction.editing_notes;
  let sceneVisuals = [...baseSceneVisuals];
  let attempt = build({ includeNarrationQuote: "none", visualStyle, editingNotes, sceneVisuals });

  for (let i = 0; i < 6 && attempt.length > MAX_PROMPT_CHARS; i++) {
    const over = attempt.length - MAX_PROMPT_CHARS;
    const totalLen = visualStyle.length + editingNotes.length + sceneVisuals.reduce((sum, v) => sum + v.length, 0);
    if (totalLen < 100) break; // floor guard — nothing meaningful left to trim, stop rather than gut every field to near-zero

    const shrink = (text: string) => truncateField(text, Math.max(20, text.length - Math.ceil((over * text.length) / totalLen)));
    visualStyle = shrink(visualStyle);
    editingNotes = shrink(editingNotes);
    sceneVisuals = sceneVisuals.map(shrink);
    attempt = build({ includeNarrationQuote: "none", visualStyle, editingNotes, sceneVisuals });
  }

  // If it's STILL over (pathological case — extremely long narration with
  // many scenes even after every non-narration field is near its floor),
  // leave it as-is rather than touch narration; the caller logs this case
  // so it's visible rather than silently corrupting the narration ViewMax
  // actually reads.
  return attempt;
}

export async function generateVideoPrompt(scriptId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: script, error: scriptError } = await supabase
    .from("content_scripts")
    .select("idea_id, style, hook, beats, full_script, scene_breakdown, character_consistency, score, score_rationale")
    .eq("id", scriptId)
    .single();
  if (scriptError || !script) return { error: "Script not found." as const };
  const idea = (await supabase.from("content_ideas").select("title, concept, content_domain").eq("id", script.idea_id).single()).data ?? { title: "", concept: "", content_domain: "general" };
  const isAffiliate = idea.content_domain === "amazon_affiliate";

  let scenes = (script.scene_breakdown as SceneBeat[]) ?? [];
  if (!scenes.length) return { error: "Script has no scene breakdown." as const };

  let hook = script.hook;
  let beats = script.beats as ScriptBeats;
  let fullScript = script.full_script;
  let durationS = scenes.reduce((sum, s) => sum + s.duration_s, 0);
  let scriptWasTightened = false;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  // Real bug found 2026-08-13: ViewMax's ENTIRE model catalog has a hard
  // ceiling of ~30s per clip (no model, at any price, produces more) —
  // often tighter than what a narration-first, no-artificial-ceiling
  // script naturally needs. Without reconciling against that BEFORE
  // assembling the prompt, TARGET DURATION would claim a length the clip
  // being generated can't actually hold — asking the model to speak more
  // than its own output can fit, a very plausible cause of real
  // "media generation failed" responses, not just a cosmetic mismatch.
  // Resolved here by checking the live catalog for the best real option
  // and, if it falls meaningfully short, tightening the narration itself
  // (same real-rewrite logic as the length-QC pass in
  // generate-content-scripts.ts) rather than writing a prompt the
  // delivered video was never going to be able to satisfy.
  try {
    const models = await listViewMaxModels("video");
    if (models?.length) {
      const initialOption = pickCheapestVideoOption(models, durationS, ASPECT_RATIO);
      const deliverableS = initialOption ? estimateOptionDurationS(initialOption) : 0;

      if (deliverableS > 0 && deliverableS < durationS * DELIVERABLE_DURATION_MATCH_RATIO) {
        let current: PreparedVariant = {
          style: (script.style as PreparedVariant["style"]) ?? "curiosity",
          hook,
          beats,
          scene_breakdown: scenes,
          character_consistency: script.character_consistency ?? "",
          score: script.score ?? 0,
          score_rationale: script.score_rationale ?? "",
          full_script: fullScript,
          word_count: fullScript.trim().split(/\s+/).filter(Boolean).length,
          target_duration_s: durationS,
        };

        // Same reasoning as generate-content-scripts.ts's own tightening
        // pass: an AI rewrite call must never see the disclosure text, or
        // it risks paraphrasing or dropping legally-required wording.
        // Strip before tightening, reserve its word count out of the
        // budget, then re-append fresh afterward regardless of whether
        // tightening actually changed anything.
        let maxWords = wordsFromDurationS(deliverableS);
        if (isAffiliate) {
          current = stripDisclosureScene(current);
          maxWords = Math.max(1, maxWords - wordCount(AMAZON_DISCLOSURE_TEXT));
        }

        let tightened = await tightenNarrationToWordBudget(anthropic, model, idea as { title: string; concept: string }, current, maxWords);
        if (isAffiliate) tightened = appendDisclosureScene(tightened);

        if (tightened.full_script !== fullScript) {
          scriptWasTightened = true;
          hook = tightened.hook;
          beats = tightened.beats;
          fullScript = tightened.full_script;
          scenes = tightened.scene_breakdown;
          durationS = scenes.reduce((sum, s) => sum + s.duration_s, 0);

          // Persist the shortened narration back onto the script itself —
          // not just the assembled prompt — so the review UI, any future
          // hand-edit, and the ViewMax submission all agree on what's
          // actually being spoken, rather than the prompt silently
          // diverging from the stored script.
          await supabase.from("content_scripts").update({ hook, beats, full_script: fullScript, scene_breakdown: scenes }).eq("id", scriptId);
        }
      }
    }
  } catch (error) {
    // Best-effort — if the live catalog can't be checked (ViewMax
    // unconfigured, network issue), fall back to the narration's natural
    // word-count-derived duration exactly as before this reconciliation
    // existed, rather than failing prompt generation over it.
    console.error(`Video-prompt duration reconciliation against the live ViewMax catalog failed for script ${scriptId} (continuing with the natural duration):`, error);
  }

  const typedScript: Script = {
    idea_id: script.idea_id,
    style: script.style,
    hook,
    beats,
    full_script: fullScript,
    scene_breakdown: scenes,
    character_consistency: script.character_consistency ?? "",
  };

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1200,
      system: buildSystemPrompt(typedScript),
      tools: [PROMPT_POLISH_TOOL],
      tool_choice: { type: "tool", name: "submit_prompt_direction" },
      messages: [{ role: "user", content: "Submit the visual direction." }],
    });

    await recordContentUsage({
      ideaId: typedScript.idea_id,
      stage: "video_prompt",
      provider: "anthropic",
      units: response.usage.input_tokens + response.usage.output_tokens,
      unitType: "tokens",
    });

    const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    if (!toolUse) return { error: "The AI did not return a video prompt." as const };

    const direction = toolUse.input as { visual_style: string; scene_visuals: { order: number; visual: string }[]; editing_notes: string };
    const cleanDirection = {
      visual_style: stripMarkdownEmphasis(direction.visual_style),
      editing_notes: stripMarkdownEmphasis(direction.editing_notes),
      scene_visuals: direction.scene_visuals.map((v) => ({ order: v.order, visual: stripMarkdownEmphasis(v.visual) })),
    };

    const prompt = assemblePrompt(typedScript, durationS, cleanDirection);
    if (prompt.length > MAX_PROMPT_CHARS) {
      console.error(`Video prompt for script ${scriptId} is ${prompt.length} chars, over the ${MAX_PROMPT_CHARS} budget, after full trim cascade — narration was long enough that only non-narration fields could be trimmed.`);
    }

    const videoPrompt: VideoPromptSpec = {
      prompt,
      style_notes: cleanDirection.visual_style,
      duration_s: durationS,
      aspect_ratio: ASPECT_RATIO,
      resolution: "1080p",
    };

    await supabase
      .from("content_scripts")
      .update({ video_prompt: videoPrompt, prompt_generated_at: new Date().toISOString() })
      .eq("id", scriptId);

    await supabase.from("content_ideas").update({ status: "ready_for_video" }).eq("id", typedScript.idea_id);

    await logAuditEvent({
      actor: "system",
      actorType: "system",
      action: "content.video_prompt_generated",
      targetType: "content_idea",
      targetId: typedScript.idea_id,
      metadata: { script_id: scriptId, duration_s: durationS, prompt_chars: prompt.length, narration_tightened_for_viewmax_ceiling: scriptWasTightened },
    });

    return { videoPrompt };
  } catch (error) {
    console.error(`Failed to generate video prompt for script ${scriptId}:`, error);
    return { error: "The prompt-generation agent is temporarily unavailable." as const };
  }
}
