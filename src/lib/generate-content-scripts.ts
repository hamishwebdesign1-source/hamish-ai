import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { logAuditEvent } from "@/lib/audit-log";
import { generateVideoPrompt } from "@/lib/generate-video-prompt";
import { recordContentUsage } from "@/lib/content-ai-usage";
import type { ContentIdeaResearch } from "@/lib/research-content-idea";

// Content Factory MVP Phase B (docs/content-factory-plan.md) — the script
// stage. One forced-tool Haiku call produces three variants in three
// distinct retention archetypes (curiosity, shock/surprise, story-driven —
// three of the brief's four suggested styles; "question-driven" folded
// into "curiosity" rather than adding a fourth call, since every idea that
// reaches this stage already cleared research-content-idea.ts's
// MIN_SCORE_TO_PROCEED gate, i.e. is already the "high-value concept" the
// brief reserves variant generation for).
//
// REDESIGNED 2026-08-12 around narration -> duration -> scenes -> visuals
// -> captions, not the reverse. The original version asked for scenes
// summing to a fixed ViewMax-pricing-driven duration (8-12s or 20-30s),
// which is exactly backwards: Hamish's real feedback on the resulting
// videos was "too short, rushed narration, incomplete sentences, too many
// actions for the available time" — a direct consequence of writing
// narration to fit a duration instead of deriving the duration from the
// narration. Now: the model writes complete, natural narration first with
// no duration target at all, we compute a real target duration from its
// actual word count (WORDS_PER_MINUTE below), and per-scene durations are
// allocated proportionally to how many words of narration each scene
// actually covers — never guessed by the model. ViewMax's cost-cliff
// economics (still real — see viewmax.ts) are now handled entirely on the
// submission side (pickCheapestVideoOption), not smuggled into the
// creative brief here.
//
// No mandatory "pick one of three" human gate — Hamish said he trusts the
// judgement here. The model scores each variant itself (0-10,
// self-assessed against the same idea/research context, not a separate
// call) and the strongest is auto-selected and auto-chained into
// generate-video-prompt.ts, same "cheap evaluation, chain automatically"
// shape as discover-content-ideas.ts chaining into research. Every variant
// stays stored and visible — see selectContentScript in admin/actions.ts
// for the manual override path.

// Matches the brief's own worked examples almost exactly (75w -> ~35s,
// 100w -> ~46s, 125w -> ~58s, all within its stated 130-150wpm guidance)
// without needing an extra pause-buffer multiplier on top.
const WORDS_PER_MINUTE = 130;
// "Too long for the intended format" (brief's own QC point) — beyond this
// the narration gets one tightening pass rather than accepting an
// unrealistically long short-form video. ~170 words is roughly 78s at
// 130wpm, already a long Short/TikTok by genre norms.
const MAX_REASONABLE_WORDS = 170;
const MIN_SCENE_SECONDS = 3; // a scene shorter than this reads as a rushed cut no matter how well-paced the voiceover is

export type ScriptBeats = {
  setup: string;
  escalation: string;
  payoff: string;
  ending: string;
};

// scene_breakdown's AI-authored shape — deliberately has NO duration
// field. Duration is derived downstream from narration_segment's real
// word count (see allocateSceneDurations), never guessed by the model —
// that guessing was a source of the original "rushed" problem (the model
// would write 5 seconds of narration and label it "3s").
export type RawSceneBeat = {
  order: number;
  beat: "hook" | "setup" | "escalation" | "payoff" | "ending";
  narration_segment: string;
  visual_description: string;
  on_screen_text: string;
};

export type SceneBeat = RawSceneBeat & { duration_s: number };

export type ScriptVariant = {
  style: "curiosity" | "shock" | "story";
  hook: string;
  beats: ScriptBeats;
  scene_breakdown: SceneBeat[];
  character_consistency: string; // empty string if no recurring character
  score: number;
  score_rationale: string;
};

function researchContext(research: ContentIdeaResearch | null): string {
  if (!research) return "";
  return `
Cached research on this idea (already paid for — treat as ground truth, don't re-derive):
- Suggested angle: ${research.suggested_angle}
- Trend validation: ${research.trend_validation}
- Audience fit: ${research.audience_fit}
- Differentiation: ${research.differentiation}
- Risk notes: ${research.risk_notes.join("; ") || "none noted"}`;
}

function buildSystemPrompt(idea: { title: string; concept: string; topic: string | null; research: ContentIdeaResearch | null }): string {
  return `You are writing short-form documentary-style video narration (YouTube Shorts / TikTok) for Hamish AI's content channel. Write THREE distinct variants of the same idea, each committing fully to a different retention archetype:

1. "curiosity" — an open loop / curiosity-gap hook, resolved by the payoff.
2. "shock" — a surprise or contrarian-claim hook, the payoff is the justification.
3. "story" — a short narrative arc (a specific moment, not a generic anecdote), the hook is the story's most striking beat.

Idea title: ${idea.title}
Concept: ${idea.concept}
${idea.topic ? `Topic: ${idea.topic}` : ""}
${researchContext(idea.research)}

NARRATION COMES FIRST — everything else exists to serve it, not the other way round. Write the narration (hook + setup + escalation + payoff + ending) as a complete, natural spoken script FIRST, the way a real documentary narrator would actually say it out loud at a natural conversational pace. Do not write for a fixed duration and do not pad or compress to hit any target length — let the story's real content decide how long it needs to be. A simple, punchy idea might only need 40-60 words; a fuller story with a real setup and payoff might genuinely need 100-150 words. Every sentence must be a complete, natural sentence, never a fragment written to save time. Never use generic AI-sounding phrasing ("in today's fast-paced world", "unlock the power of", "game-changer") or a throat-clearing opener ("let's talk about", "did you know"). Write like a specific person talking — contractions, short sentences, real rhythm. The ending should give a genuine reason to watch again or think about this later — a twist, an open question, a loop back to the hook, or a concrete takeaway — never a generic "like and subscribe".

Once the narration is written, break it into scene_breakdown entries — as many or as few as the STORY needs, never a fixed count. For each entry: narration_segment is a VERBATIM quote of the exact portion of the full narration spoken during that scene (all segments, in order, must concatenate back to the complete narration with nothing skipped, altered, or reordered); visual_description is ONE clear, uncomplicated shot, not a montage of several different actions — a slow push-in, a held close-up, a gentle tracking shot, one clear moment; on_screen_text is a short caption. Prefer FEWER, LONGER, calmer shots over rapid cuts — a scene should typically cover at least one full sentence of narration, often several, not a sentence fragment. Never combine more than one distinct action or subject change inside a single visual_description; if a moment needs two different things shown, that's two scenes, not one crowded one. Avoid whip zooms, rapid montages, and constant camera movement — the visuals support the narration, they don't compete with it.

Caption standard: on_screen_text must be SHORT and punchy (typically 3-6 words) reinforcing the key point of that scene — NEVER a duplicate or near-duplicate of the narration_segment it accompanies. Example: if the narration says "Patients were told they suffered from a mysterious condition called nervous debility," the caption is "NERVOUS DEBILITY", not the full sentence.

If the idea involves a recurring person across multiple scenes, set character_consistency to one concrete, specific physical description (approximate age, build, clothing, distinguishing features) that must stay IDENTICAL every time that person appears in a visual_description — never let them be described differently scene to scene. Leave character_consistency as an empty string if there's no recurring character.

Finally, score each variant 0-10 on its own real strength (hook impact, natural pacing, payoff satisfaction, novelty — a variant that reads at a genuinely natural conversational pace scores higher than one that feels compressed or rushed) with one honest sentence of rationale — these scores decide which variant gets produced, so be genuinely discriminating rather than scoring everything an 8.`;
}

const SCENE_BREAKDOWN_SCHEMA = {
  type: "array" as const,
  items: {
    type: "object" as const,
    properties: {
      order: { type: "number" },
      beat: { type: "string", enum: ["hook", "setup", "escalation", "payoff", "ending"] },
      narration_segment: {
        type: "string",
        description: "Verbatim quote of the exact narration spoken during this scene — all segments concatenate back to the full narration, in order, nothing skipped or altered.",
      },
      visual_description: { type: "string", description: "ONE clear shot — no montages, no more than one action or subject change." },
      on_screen_text: { type: "string", description: "Short punchy caption (typically 3-6 words) — never a duplicate of narration_segment." },
    },
    required: ["order", "beat", "narration_segment", "visual_description", "on_screen_text"],
  },
  minItems: 2,
  maxItems: 8,
  description: "As many scenes as the narration's natural beats need — not a fixed count. Each should typically hold for at least one full sentence of narration.",
};

const SCRIPTS_TOOL: Anthropic.Tool = {
  name: "submit_script_variants",
  description: "Submit the three script variants for this video idea.",
  input_schema: {
    type: "object",
    properties: {
      variants: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            style: { type: "string", enum: ["curiosity", "shock", "story"] },
            hook: { type: "string", description: "The first 1-3 seconds, spoken — a complete natural sentence, not a fragment." },
            beats: {
              type: "object",
              properties: {
                setup: { type: "string" },
                escalation: { type: "string" },
                payoff: { type: "string" },
                ending: { type: "string" },
              },
              required: ["setup", "escalation", "payoff", "ending"],
            },
            scene_breakdown: SCENE_BREAKDOWN_SCHEMA,
            character_consistency: { type: "string", description: "Concrete, consistent physical description of a recurring character, or empty string if none." },
            score: { type: "number", description: "0-10, this variant's own real strength." },
            score_rationale: { type: "string" },
          },
          required: ["style", "hook", "beats", "scene_breakdown", "character_consistency", "score", "score_rationale"],
        },
      },
    },
    required: ["variants"],
  },
};

// A separate, focused tool for the tightening pass (see tightenNarrationIfNeeded)
// — same scene_breakdown shape, no style/score fields since it's refining
// an already-chosen variant, not generating fresh candidates.
const TIGHTEN_TOOL: Anthropic.Tool = {
  name: "submit_tightened_script",
  description: "Submit the shortened narration and its scene breakdown.",
  input_schema: {
    type: "object",
    properties: {
      hook: { type: "string" },
      beats: {
        type: "object",
        properties: {
          setup: { type: "string" },
          escalation: { type: "string" },
          payoff: { type: "string" },
          ending: { type: "string" },
        },
        required: ["setup", "escalation", "payoff", "ending"],
      },
      scene_breakdown: SCENE_BREAKDOWN_SCHEMA,
      character_consistency: { type: "string" },
    },
    required: ["hook", "beats", "scene_breakdown", "character_consistency"],
  },
};

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Real target duration, computed from what the narration actually says —
// never a guessed/fixed number. See WORDS_PER_MINUTE's comment for why
// 130wpm alone (no extra buffer) already matches the brief's own worked
// examples.
export function computeDurationFromWordCount(words: number): number {
  return Math.max(4, Math.round((words / WORDS_PER_MINUTE) * 60));
}

// Allocates each scene a slice of the total duration proportional to how
// many words of narration it actually covers — replaces the old approach
// of asking the model to guess a duration_s per scene directly, which is
// exactly what produced scenes labelled "3s" that actually needed 5+
// seconds to say naturally. Also merges any scene that would round down
// to less than MIN_SCENE_SECONDS into its neighbour, so the model
// over-fragmenting the narration can't produce a rushed-feeling cut even
// if it ignores the "hold longer" guidance.
export function allocateSceneDurations(scenes: RawSceneBeat[], totalDurationS: number): SceneBeat[] {
  if (!scenes.length) return [];

  const merged: RawSceneBeat[] = [];
  for (const scene of scenes) {
    const words = wordCount(scene.narration_segment);
    const prev = merged[merged.length - 1];
    const prevWords = prev ? wordCount(prev.narration_segment) : 0;
    const prevShareS = prev ? (prevWords / Math.max(1, scenes.reduce((s, x) => s + wordCount(x.narration_segment), 0))) * totalDurationS : Infinity;
    if (prev && prevShareS < MIN_SCENE_SECONDS) {
      prev.narration_segment = `${prev.narration_segment} ${scene.narration_segment}`.trim();
      prev.visual_description = `${prev.visual_description} ${scene.visual_description}`.trim();
      continue;
    }
    merged.push({ ...scene });
    void words; // computed for prevShareS on the *next* iteration via prev
  }

  const wordCounts = merged.map((s) => Math.max(1, wordCount(s.narration_segment)));
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);

  return merged.map((s, i) => ({
    ...s,
    order: i + 1,
    duration_s: Math.max(MIN_SCENE_SECONDS, Math.round((wordCounts[i] / totalWords) * totalDurationS)),
  }));
}

// A human hand-edit (editContentScript in admin/actions.ts) rewrites
// hook/beats free text directly and has no reason to also re-run the
// scene-breakdown AI call. Without this, the stored scene_breakdown would
// go stale against the new full_script — its narration_segment quotes
// would no longer be real substrings of the narration, and duration_s
// would still reflect the pre-edit word count, silently reintroducing the
// exact "duration doesn't match what's actually being said" bug this
// redesign exists to fix. This re-slices the NEW narration across the
// existing scenes in the same word-count proportions the AI originally
// chose (an approximation — it can land mid-clause rather than on a
// sentence boundary — but it keeps every invariant that matters: segments
// still concatenate back to the real edited narration, durations still
// derive from real word counts) rather than leaving stale data in place.
export function reallocateScenesForEditedNarration(scenes: SceneBeat[], newFullScript: string): SceneBeat[] {
  if (!scenes.length) return scenes;
  const words = newFullScript.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return scenes;

  const totalDurationS = computeDurationFromWordCount(words.length);
  const oldTotalWords = scenes.reduce((sum, s) => sum + Math.max(1, wordCount(s.narration_segment)), 0);

  let cursor = 0;
  const raw: RawSceneBeat[] = scenes.map((s, i) => {
    const isLast = i === scenes.length - 1;
    const share = Math.max(1, wordCount(s.narration_segment)) / oldTotalWords;
    const takeCount = isLast ? Math.max(1, words.length - cursor) : Math.max(1, Math.round(share * words.length));
    const segmentWords = words.slice(cursor, cursor + takeCount);
    cursor += segmentWords.length;
    return {
      order: s.order,
      beat: s.beat,
      narration_segment: segmentWords.join(" "),
      visual_description: s.visual_description,
      on_screen_text: s.on_screen_text,
    };
  });

  return allocateSceneDurations(raw, totalDurationS);
}

function stripBeats(beats: ScriptBeats): ScriptBeats {
  return {
    setup: stripMarkdownEmphasis(beats.setup),
    escalation: stripMarkdownEmphasis(beats.escalation),
    payoff: stripMarkdownEmphasis(beats.payoff),
    ending: stripMarkdownEmphasis(beats.ending),
  };
}

function stripScenes(scenes: RawSceneBeat[]): RawSceneBeat[] {
  return scenes.map((s) => ({ ...s, visual_description: stripMarkdownEmphasis(s.visual_description), on_screen_text: stripMarkdownEmphasis(s.on_screen_text) }));
}

function fullScriptText(hook: string, beats: ScriptBeats): string {
  return [hook, beats.setup, beats.escalation, beats.payoff, beats.ending].join(" ");
}

type PreparedVariant = {
  style: "curiosity" | "shock" | "story";
  hook: string;
  beats: ScriptBeats;
  scene_breakdown: SceneBeat[];
  character_consistency: string;
  score: number;
  score_rationale: string;
  full_script: string;
  word_count: number;
  target_duration_s: number;
};

function prepareVariant(raw: {
  style?: "curiosity" | "shock" | "story";
  hook: string;
  beats: ScriptBeats;
  scene_breakdown: RawSceneBeat[];
  character_consistency: string;
  score?: number;
  score_rationale?: string;
}): PreparedVariant {
  const hook = stripMarkdownEmphasis(raw.hook);
  const beats = stripBeats(raw.beats);
  const full_script = fullScriptText(hook, beats);
  const word_count = wordCount(full_script);
  const target_duration_s = computeDurationFromWordCount(word_count);
  const scene_breakdown = allocateSceneDurations(stripScenes(raw.scene_breakdown), target_duration_s);

  return {
    style: raw.style ?? "curiosity",
    hook,
    beats,
    scene_breakdown,
    character_consistency: stripMarkdownEmphasis(raw.character_consistency ?? ""),
    score: raw.score ?? 0,
    score_rationale: raw.score_rationale ?? "",
    full_script,
    word_count,
    target_duration_s,
  };
}

// The brief's own QC point: "if the script is too long for the intended
// format, intelligently reduce/rewrite the narration BEFORE generating
// the ViewMax prompt rather than attempting to squeeze it into an
// unrealistic duration." Applied only to the auto-selected winner (not
// all 3 candidates) to keep this a cheap, targeted fix rather than
// tripling the cost of every generation. Rewrites narration properly
// (shortens sentences/cuts a weaker beat) rather than truncating — a
// genuinely different operation from the duration-mismatch bug this
// pipeline already guards against downstream.
async function tightenNarrationIfNeeded(anthropic: Anthropic, model: string, idea: { title: string; concept: string }, variant: PreparedVariant): Promise<PreparedVariant> {
  if (variant.word_count <= MAX_REASONABLE_WORDS) return variant;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1500,
      system: `This short-form video narration for "${idea.title}" (${idea.concept}) came out at ${variant.word_count} words — too long for a short-form video even at a natural conversational pace (roughly ${Math.round(variant.target_duration_s)}s). Rewrite it shorter by cutting the weakest beat or tightening sentences — never by truncating mid-sentence or removing words from a sentence you keep. Every sentence in your rewrite must still be complete and natural. Aim for well under ${MAX_REASONABLE_WORDS} words while keeping the hook, the core turn, and the payoff intact.

Current hook: ${variant.hook}
Current setup: ${variant.beats.setup}
Current escalation: ${variant.beats.escalation}
Current payoff: ${variant.beats.payoff}
Current ending: ${variant.beats.ending}
Character consistency (keep as-is if present): ${variant.character_consistency || "none"}

Then re-do the scene_breakdown for your shortened narration, same rules as before: narration_segment is a verbatim quote, segments concatenate back to the full shortened narration, one clear shot per scene, short punchy captions.`,
      tools: [TIGHTEN_TOOL],
      tool_choice: { type: "tool", name: "submit_tightened_script" },
      messages: [{ role: "user", content: "Rewrite it shorter and submit." }],
    });

    await recordContentUsage({ stage: "script_generation", provider: "anthropic", units: response.usage.input_tokens + response.usage.output_tokens, unitType: "tokens" });

    const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    if (!toolUse) return variant; // best-effort — keep the original rather than fail the whole generation over a polish pass

    const raw = toolUse.input as { hook: string; beats: ScriptBeats; scene_breakdown: RawSceneBeat[]; character_consistency: string };
    const tightened = prepareVariant({ ...raw, style: variant.style, score: variant.score, score_rationale: variant.score_rationale });
    // Only use the tightened version if it actually helped — a rewrite
    // that came back longer than it started is worse than the original.
    return tightened.word_count < variant.word_count ? tightened : variant;
  } catch (error) {
    console.error("Narration tightening pass failed (keeping original):", error);
    return variant;
  }
}

export type GenerateScriptsResult =
  | { error: string }
  | { variants: (PreparedVariant & { id: string })[]; selectedId: string };

export async function generateContentScripts(ideaId: string): Promise<GenerateScriptsResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: idea, error: ideaError } = await supabase
    .from("content_ideas")
    .select("title, concept, topic, research")
    .eq("id", ideaId)
    .single();
  if (ideaError || !idea) return { error: "Idea not found." as const };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  try {
    const response = await anthropic.messages.create({
      model,
      // 3 full variants x up to 8 scenes each, with narration_segment
      // duplicating beats text plus JSON structural overhead, comfortably
      // exceeds 3500 output tokens (confirmed empirically: a real call hit
      // stop_reason "max_tokens" with a truncated, empty tool input at
      // 3500). 8000 gives real headroom without being close to Haiku's
      // output ceiling.
      max_tokens: 8000,
      system: buildSystemPrompt(idea as { title: string; concept: string; topic: string | null; research: ContentIdeaResearch | null }),
      tools: [SCRIPTS_TOOL],
      tool_choice: { type: "tool", name: "submit_script_variants" },
      messages: [{ role: "user", content: "Write the three script variants and submit them." }],
    });

    await recordContentUsage({
      ideaId,
      stage: "script_generation",
      provider: "anthropic",
      units: response.usage.input_tokens + response.usage.output_tokens,
      unitType: "tokens",
    });

    const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    if (!toolUse) return { error: "The AI did not return scripts." as const };
    if (response.stop_reason === "max_tokens") {
      // The response was cut off mid-generation — toolUse.input is
      // whatever partial/empty JSON that left behind, never trustworthy.
      // Surface this distinctly from "the model just returned nothing" so
      // a real truncation (raise max_tokens further) isn't confused with
      // a genuine empty-response failure.
      console.error(`generateContentScripts: response for idea ${ideaId} was truncated (stop_reason=max_tokens) — raise max_tokens.`);
      return { error: "The scripting agent's response was cut off before completing — try again." as const };
    }

    const { variants: rawVariants } = toolUse.input as {
      variants: { style: "curiosity" | "shock" | "story"; hook: string; beats: ScriptBeats; scene_breakdown: RawSceneBeat[]; character_consistency: string; score: number; score_rationale: string }[];
    };
    if (!rawVariants?.length) return { error: "The AI returned no script variants." as const };

    const variants = rawVariants.map(prepareVariant);

    // Tighten only the auto-selected winner, per the brief's cost/scope
    // reasoning above — not every candidate.
    const winnerIndex = variants.reduce((bestIdx, v, i) => (v.score > variants[bestIdx].score ? i : bestIdx), 0);
    variants[winnerIndex] = await tightenNarrationIfNeeded(anthropic, model, idea as { title: string; concept: string }, variants[winnerIndex]);

    const { data: insertedRows, error: insertError } = await supabase
      .from("content_scripts")
      .insert(
        variants.map((v) => ({
          idea_id: ideaId,
          style: v.style,
          status: "candidate",
          hook: v.hook,
          beats: v.beats,
          full_script: v.full_script,
          scene_breakdown: v.scene_breakdown,
          score: v.score,
          score_rationale: v.score_rationale,
          character_consistency: v.character_consistency,
        }))
      )
      .select("id, style, hook, beats, scene_breakdown, score, score_rationale, character_consistency");
    if (insertError || !insertedRows?.length) {
      console.error("Failed to save script variants:", insertError);
      return { error: "Scripts generated but failed to save." as const };
    }

    const winner = insertedRows[winnerIndex];

    // Real bug, found 2026-08-12: on a regenerate, a script from an
    // earlier round could still be sitting at status='selected' from
    // that round's own auto-selection — this update only ever demoted
    // the new batch's own losers, leaving TWO rows 'selected' for the
    // same idea at once, which silently broke every downstream
    // .eq("status","selected") lookup (submitIdeaForVideo's
    // .maybeSingle() included). Every non-winning script for this idea,
    // old or new, is demoted here — not just this batch's siblings.
    await supabase.from("content_scripts").update({ status: "rejected" }).eq("idea_id", ideaId).neq("id", winner.id);
    await supabase.from("content_scripts").update({ status: "selected", reviewed_at: new Date().toISOString() }).eq("id", winner.id);

    await supabase.from("content_ideas").update({ status: "script_review" }).eq("id", ideaId);

    await logAuditEvent({
      actor: "system",
      actorType: "system",
      action: "content.scripts_generated",
      targetType: "content_idea",
      targetId: ideaId,
      metadata: { count: insertedRows.length, selected_style: winner.style, selected_score: winner.score, word_count: variants[winnerIndex].word_count, target_duration_s: variants[winnerIndex].target_duration_s },
    });

    // Best-effort — a failed prompt-generation call leaves the idea sitting
    // at 'script_review' (a visible, non-blocking fallback) rather than
    // taking down script generation itself. See generate-video-prompt.ts.
    try {
      await generateVideoPrompt(winner.id);
    } catch (error) {
      console.error(`Post-selection video-prompt generation failed for script ${winner.id}:`, error);
    }

    return {
      variants: insertedRows.map((row, i) => ({ ...variants[i], id: row.id })),
      selectedId: winner.id,
    };
  } catch (error) {
    console.error(`Failed to generate scripts for idea ${ideaId}:`, error);
    return { error: "The scripting agent is temporarily unavailable." as const };
  }
}
