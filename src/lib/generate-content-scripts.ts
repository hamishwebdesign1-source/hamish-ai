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
export const WORDS_PER_MINUTE = 130;
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
// "disclosure" is never AI-generated (see SCENE_BREAKDOWN_SCHEMA's enum,
// which deliberately excludes it) — it's reserved for the scene
// appendDisclosureScene inserts deterministically on Amazon-affiliate
// content, below.
export type RawSceneBeat = {
  order: number;
  beat: "hook" | "setup" | "escalation" | "payoff" | "ending" | "disclosure";
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

// Video Affiliate Engine, Phase 0 — the "Operating Blueprint" artifact's
// "same shape, different domain" reuse of this exact pipeline for Amazon
// product content. Kept intentionally small: whatever the pipeline
// eventually needs to know about a specific product (ASIN, real footage
// source) is looked up separately, not authored by the script-writing
// call.
export type AffiliateProduct = {
  product_name: string;
  asin?: string;
  footage_source?: string;
  footage_status?: string;
  draft_amazon_url?: string;
  // Real, verified facts (price/rating/review_count/badge pulled from the
  // live listing, not guessed) — see buildSystemPrompt's comment on why
  // these exist: grounding the script in real numbers is what replaces
  // the fabricated personal-testing anecdotes the model reached for when
  // given nothing concrete to work with.
  price?: string;
  rating?: number;
  review_count?: number;
  badge?: string | null;
};

function buildSystemPrompt(idea: {
  title: string;
  concept: string;
  topic: string | null;
  research: ContentIdeaResearch | null;
  content_domain: string;
  affiliate_product: AffiliateProduct | null;
}): string {
  const isAffiliate = idea.content_domain === "amazon_affiliate";

  const archetypeIntro = isAffiliate
    ? `You are writing a short-form Amazon product review (YouTube Shorts / TikTok) as an Amazon Associate. Write THREE distinct variants of the same product angle, each committing fully to a different retention archetype — NONE of these involve you or anyone else having used the product, see the mandatory rule below:

1. "curiosity" — an open loop about the most surprising thing the real facts below imply (why does something this cheap have this many five-star ratings?), resolved by the payoff.
2. "shock" — a contrarian or surprising claim built ENTIRELY from the real facts about THIS product alone (is the price surprisingly low for a rating/review-count this strong; is a weaker rating a real reason for caution rather than something to gloss over) — NEVER a comparison to any other specific product, brand, or price you were not given. If you want to gesture at "pricier alternatives" existing, that's fine only in vague, unquantified terms (e.g. "compared to pricier options") — inventing a specific competitor price or product ("a £50 electric one," "premium mats run £80-100") is exactly as fabricated as a fake personal story.
3. "story" — NOT a first-person "I used this" narrative. Instead, a short narrative about the KIND OF PERSON or MOMENT this solves for, told in second person or observationally ("the moment your jar lid won't budge and your hands are wet") — vivid and specific about the problem, never about invented personal testing of the product.`
    : `You are writing short-form documentary-style video narration (YouTube Shorts / TikTok) for Hamish AI's content channel. Write THREE distinct variants of the same idea, each committing fully to a different retention archetype:

1. "curiosity" — an open loop / curiosity-gap hook, resolved by the payoff.
2. "shock" — a surprise or contrarian-claim hook, the payoff is the justification.
3. "story" — a short narrative arc (a specific moment, not a generic anecdote), the hook is the story's most striking beat.`;

  const p = idea.affiliate_product;
  const productContext =
    isAffiliate && p
      ? `
Product: ${p.product_name}${p.asin ? ` (ASIN ${p.asin})` : ""}
Real, verified facts — this is ALL you actually know about this product, and the only material you're allowed to build claims from:
${p.price ? `- Price: ${p.price}\n` : ""}${p.rating != null ? `- Rating: ${p.rating}/5${p.review_count != null ? ` from ${p.review_count.toLocaleString()} ratings` : ""}\n` : ""}${p.badge ? `- ${p.badge}\n` : ""}`
      : "";

  // Real bug found 2026-08-14: even with "take a genuine position"
  // guidance, the model reached for fabricated first-person testimony
  // ("I tested it every day for a month," "my mum has arthritis") to
  // manufacture that opinion — presenting invented personal experience as
  // real is a materially worse problem than the disclosure text itself
  // (it's fake-review territory, not just a missing-label issue). Fixed
  // by removing the option entirely: no claim may rest on invented
  // first-person testing, and the only real material available is the
  // verified facts above — genuine opinion has to be built FROM those
  // real numbers (is 47,000 five-star ratings at £2.46 actually
  // impressive? is a 3.6★ average with under 1,000 reviews a reason for
  // real caution?), not from a story that never happened.
  const affiliateGuidance = isAffiliate
    ? `

THIS IS PAID/AFFILIATE CONTENT. Do NOT invent ANY first-person purchasing or testing history — not about this product, and not about some other product you claim to have bought/tried/compared it to either ("I spent twice as much on a sharpener that..." is exactly as fabricated as "I tested this for a month," just aimed at a different item). Do NOT invent a specific competitor price, brand, or product either ("premium ones run £80-100," "a £50 electric version") — you were not given any real data about competing products, so any specific number you state about one is made up, full stop, exactly the same problem as a fake personal anecdote. Zero invented personal anecdotes, zero specific test results or failure modes, zero invented competitor facts. You have no first-hand experience with this product OR any other, and no real data on what anything else costs — don't pretend otherwise, directly or by implication. The only real material you have is the verified facts above (price, rating, review count, badge) — build a genuine, specific opinion FROM those real numbers alone: is the price remarkable for what it does, does the review count/rating combination actually mean something, is a lower rating worth flagging honestly rather than glossing over. "Reviewers say" or "at this price and this many five-star ratings" framing is fine; a vague unquantified nod to "pricier alternatives" is fine; any invented specific number or story — about this product, a competitor, or yourself — is not. Never claim a feature, spec, or visual detail you don't have real basis for — the visual_description fields in scene_breakdown must describe REAL footage of the actual product (sourced separately, not AI-generated), never an imagined or embellished appearance.`
    : "";

  return `${archetypeIntro}
${productContext}

Idea title: ${idea.title}
Concept: ${idea.concept}
${idea.topic ? `Topic: ${idea.topic}` : ""}
${researchContext(idea.research)}
${affiliateGuidance}

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

// A separate, focused tool for the tightening pass (see tightenNarrationToWordBudget)
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

export type PreparedVariant = {
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

// Video Affiliate Engine (see the "Operating Blueprint" artifact and
// pinterest-amazon-affiliate-project memory) — Amazon's required
// disclosure line, exact wording. Fixed legal text, so it's never
// generated or paraphrased by the AI.
//
// REDESIGNED 2026-08-14: this used to be appended into the script/video
// prompt itself (spoken narration + a dedicated on-screen end-card
// scene) via appendDisclosureScene/stripDisclosureScene, with strip-
// before/re-append-after protection around every AI tightening pass so
// the text could never be paraphrased away. That protection worked, but
// it was solving the wrong problem: real evidence showed AI video models
// cannot reliably RENDER precise on-screen text at all — a real
// generated video came back reading "As an Amazon Assosintert - I eear
// from juting purxharless". No amount of protecting the text before it
// reaches the video model helps once the video model itself garbles it
// on the way out, and this pipeline has no verified working voiceover
// audio either, so the spoken half was never confirmed to reach anyone.
// The disclosure now lives ONLY in the video's caption/description (see
// generate-content-copy.ts) — a plain text field with zero AI-rendering
// risk — never touching the script or the ViewMax prompt at all.
export const AMAZON_DISCLOSURE_TEXT = "As an Amazon Associate, I earn from qualifying purchases.";

// The brief's own QC point: "if the script is too long for the intended
// format, intelligently reduce/rewrite the narration BEFORE generating
// the ViewMax prompt rather than attempting to squeeze it into an
// unrealistic duration." Rewrites narration properly (shortens sentences/
// cuts a weaker beat) rather than truncating — a genuinely different
// operation from the duration-mismatch bug this pipeline already guards
// against downstream.
//
// Generalized 2026-08-13 to take an explicit maxWords rather than the
// hardcoded genre-length ceiling, so generate-video-prompt.ts can reuse
// it for a second, unrelated reason: ViewMax's entire model catalog has a
// real hard ceiling of 30s per clip (no model, at any price, produces
// more), which is often tighter than what a "let the story decide its
// length" narration naturally needs. Without this, the prompt's own
// TARGET DURATION line would claim a length longer than the clip ViewMax
// is actually generating — asking the model to speak more than the video
// it's producing can hold, a very plausible cause of real generation
// failures, not just a cosmetic mismatch.
export async function tightenNarrationToWordBudget(
  anthropic: Anthropic,
  model: string,
  idea: { title: string; concept: string },
  variant: PreparedVariant,
  maxWords: number
): Promise<PreparedVariant> {
  if (variant.word_count <= maxWords) return variant;

  // Real bug found 2026-08-14: this used to accept ANY reduction
  // ("tightened.word_count < variant.word_count"), not one that actually
  // reached maxWords. For a modest cut (170 -> 130 words) that's close
  // enough not to matter. For a severe one — e.g. a 30-50s script forced
  // down to veo-3-1-fast's real 8s (~17 words) after every longer-duration
  // ViewMax model turned out unreliable — a single pass asked to "keep the
  // hook, the core turn, and the payoff intact" structurally can't comply
  // AND hit 17 words at once, so it just partially shortens (say to 70
  // words) and that got accepted as "done", leaving the video nowhere near
  // the length it would actually be generated at. Now retries up to 3
  // times, escalating the instruction each time, and for a genuinely
  // extreme compression (under ~35 words — too short to sustain 5 distinct
  // beats at all) tells the model to collapse into one continuous punchy
  // line instead of preserving the beat structure. Keeps whichever
  // attempt landed closest to maxWords without going under it by more
  // than a token or two's worth (2 words) of slack, never something that
  // still overshoots by more than a small tolerance.
  const TOLERANCE_WORDS = 5;
  let best = variant;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const current = attempt === 1 ? variant : best;
    if (current.word_count <= maxWords + TOLERANCE_WORDS) break; // already close enough

    const extreme = maxWords < 35;
    const instruction = extreme
      ? `This needs to fit an ~${maxWords}-word, single-shot video — too short to sustain a hook/setup/escalation/payoff/ending structure at all. Collapse it into ONE tight, punchy, complete statement (still natural, still true to the product) rather than a multi-beat story. Put that single line in "hook" and leave setup/escalation/payoff/ending as empty strings — do not force distinct beats that don't fit.`
      : `Rewrite it shorter by cutting the weakest beat or tightening sentences — never by truncating mid-sentence or removing words from a sentence you keep. Every sentence in your rewrite must still be complete and natural. Aim for well under ${maxWords} words while keeping the hook, the core turn, and the payoff intact.`;
    const retryNote = attempt > 1 ? ` Your previous attempt came back at ${current.word_count} words — still well over the ${maxWords}-word budget. Cut harder this time; a review is not required to keep every beat.` : "";

    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 1500,
        system: `This short-form video narration for "${idea.title}" (${idea.concept}) came out at ${current.word_count} words — too long for a short-form video even at a natural conversational pace. ${instruction}${retryNote}

Current hook: ${current.hook}
Current setup: ${current.beats.setup}
Current escalation: ${current.beats.escalation}
Current payoff: ${current.beats.payoff}
Current ending: ${current.beats.ending}
Character consistency (keep as-is if present): ${current.character_consistency || "none"}

Then re-do the scene_breakdown for your shortened narration, same rules as before: narration_segment is a verbatim quote, segments concatenate back to the full shortened narration, one clear shot per scene, short punchy captions. Never write a disclosure/sponsorship line yourself — that is added separately.`,
        tools: [TIGHTEN_TOOL],
        tool_choice: { type: "tool", name: "submit_tightened_script" },
        messages: [{ role: "user", content: "Rewrite it shorter and submit." }],
      });

      await recordContentUsage({ stage: "script_generation", provider: "anthropic", units: response.usage.input_tokens + response.usage.output_tokens, unitType: "tokens" });

      const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
      if (!toolUse) break; // best-effort — keep the best attempt so far rather than fail the whole generation

      const raw = toolUse.input as { hook: string; beats: ScriptBeats; scene_breakdown: RawSceneBeat[]; character_consistency: string };
      const tightened = prepareVariant({ ...raw, style: variant.style, score: variant.score, score_rationale: variant.score_rationale });
      // Only keep it if it actually helped — a rewrite that came back
      // longer than the current best is worse, not better.
      if (tightened.word_count < best.word_count) best = tightened;
    } catch (error) {
      console.error(`Narration tightening pass (attempt ${attempt}) failed (keeping best attempt so far):`, error);
      break;
    }
  }

  if (best.word_count > maxWords + TOLERANCE_WORDS) {
    console.error(`tightenNarrationToWordBudget: best attempt for "${idea.title}" still ${best.word_count} words against a ${maxWords}-word budget after 3 tries — shipping it anyway rather than blocking, but the video's real duration won't match this narration's natural length.`);
  }

  return best;
}

export type GenerateScriptsResult =
  | { error: string }
  | { variants: (PreparedVariant & { id: string })[]; selectedId: string };

export async function generateContentScripts(ideaId: string): Promise<GenerateScriptsResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: idea, error: ideaError } = await supabase
    .from("content_ideas")
    .select("title, concept, topic, research, content_domain, affiliate_product")
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
      system: buildSystemPrompt(idea as { title: string; concept: string; topic: string | null; research: ContentIdeaResearch | null; content_domain: string; affiliate_product: AffiliateProduct | null }),
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

    const { variants: allRawVariants } = toolUse.input as {
      variants: { style: "curiosity" | "shock" | "story"; hook: string; beats: ScriptBeats; scene_breakdown: RawSceneBeat[]; character_consistency: string; score: number; score_rationale: string }[];
    };
    if (!allRawVariants?.length) return { error: "The AI returned no script variants." as const };

    // Real bug found 2026-08-14: despite scene_breakdown being a required
    // field in SCENE_BREAKDOWN_SCHEMA, a real response omitted it entirely
    // on one of three variants, crashing prepareVariant with a bare
    // TypeError deep inside stripScenes. Same class of issue already
    // documented in research-content-idea.ts (Haiku not strictly honouring
    // a declared schema) — defend the same way: validate each variant
    // before use and drop the malformed ones rather than crash the whole
    // generation over one bad variant when the other two are fine.
    const rawVariants = allRawVariants.filter((v) => {
      const valid =
        typeof v.hook === "string" &&
        v.beats &&
        typeof v.beats.setup === "string" &&
        typeof v.beats.escalation === "string" &&
        typeof v.beats.payoff === "string" &&
        typeof v.beats.ending === "string" &&
        Array.isArray(v.scene_breakdown) &&
        v.scene_breakdown.length > 0;
      if (!valid) console.error(`generateContentScripts: dropping a malformed variant for idea ${ideaId} (style=${v.style ?? "unknown"}) — missing/invalid required fields.`);
      return valid;
    });
    if (!rawVariants.length) return { error: "The AI's script variants were all malformed — try again." as const };

    const variants = rawVariants.map(prepareVariant);

    // Tighten only the auto-selected winner, per the brief's cost/scope
    // reasoning above — not every candidate.
    const winnerIndex = variants.reduce((bestIdx, v, i) => (v.score > variants[bestIdx].score ? i : bestIdx), 0);
    variants[winnerIndex] = await tightenNarrationToWordBudget(anthropic, model, idea as { title: string; concept: string }, variants[winnerIndex], MAX_REASONABLE_WORDS);

    // Real bug found 2026-08-14: appending the disclosure into the
    // ViewMax prompt (spoken narration + an on-screen end card) doesn't
    // work — AI video models garble precise on-screen text (confirmed on
    // a real generated video: "As an Amazon Assosintert - I eear from
    // juting purxharless"), and there's no verified real voiceover audio
    // in this pipeline for the spoken half to reach anyone either. The
    // disclosure now lives ONLY in the video's caption/description (see
    // generate-content-copy.ts), a plain text field with zero AI-
    // rendering risk — not appended to the script/video prompt at all.

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
