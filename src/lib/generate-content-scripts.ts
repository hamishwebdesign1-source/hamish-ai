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
// No mandatory "pick one of three" human gate — Hamish said he trusts the
// judgement here. The model scores each variant itself (0-10,
// self-assessed against the same idea/research context, not a separate
// call) and the strongest is auto-selected and auto-chained into
// generate-video-prompt.ts, same "cheap evaluation, chain automatically"
// shape as discover-content-ideas.ts chaining into research. Every variant
// stays stored and visible — see selectContentScript in admin/actions.ts
// for the manual override path.

export type ScriptBeats = {
  setup: string;
  escalation: string;
  payoff: string;
  ending: string;
};

export type SceneBeat = {
  order: number;
  beat: "hook" | "setup" | "escalation" | "payoff" | "ending";
  visual_description: string;
  on_screen_text: string;
  duration_s: number;
};

export type ScriptVariant = {
  style: "curiosity" | "shock" | "story";
  hook: string;
  beats: ScriptBeats;
  scene_breakdown: SceneBeat[];
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
  return `You are writing short-form video scripts (YouTube Shorts / TikTok, punchy and tightly-paced) for Hamish AI's content channel. Write THREE distinct variants of the same idea, each committing fully to a different retention archetype:

1. "curiosity" — an open loop / curiosity-gap hook, resolved by the payoff.
2. "shock" — a surprise or contrarian-claim hook, the payoff is the justification.
3. "story" — a short narrative arc (a specific moment, not a generic anecdote), the hook is the story's most striking beat.

Idea title: ${idea.title}
Concept: ${idea.concept}
${idea.topic ? `Topic: ${idea.topic}` : ""}
${researchContext(idea.research)}

Writing standards, all variants: the hook must create genuine curiosity or tension in its first 1-3 seconds — no throat-clearing, no "let's talk about", no "did you know". Write the way a specific person would actually talk out loud, not marketing copy — contractions, short sentences, real rhythm. Never use generic AI-sounding phrasing ("in today's fast-paced world", "unlock the power of", "game-changer"). The ending should give a genuine reason to watch again or think about this later — a twist, an open question, a loop back to the hook, or a concrete takeaway — never a generic "like and subscribe".

For each variant also write a scene_breakdown: 4-6 short entries covering hook through ending, each with what's visually on screen (visual_description), any on-screen text overlay (on_screen_text, can be empty), and a rough duration in seconds (duration_s). Durations across all entries MUST sum to 12 seconds or less — this is a hard cost constraint of the video generation platform this pipeline uses (going even slightly over a short-clip threshold there roughly doubles the cost per video), not a stylistic preference, so favour a tight 2-4 beat arc over a padded one. A strong hook-payoff pair told in 8-12 seconds beats a meandering 20-second version every time anyway.

Finally, score each variant 0-10 on its own real strength (hook impact, pacing, payoff satisfaction, novelty) with one honest sentence of rationale — these scores decide which variant gets produced, so be genuinely discriminating rather than scoring everything an 8.`;
}

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
            hook: { type: "string", description: "The first 1-3 seconds, spoken." },
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
            scene_breakdown: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  order: { type: "number" },
                  beat: { type: "string", enum: ["hook", "setup", "escalation", "payoff", "ending"] },
                  visual_description: { type: "string" },
                  on_screen_text: { type: "string" },
                  duration_s: { type: "number" },
                },
                required: ["order", "beat", "visual_description", "on_screen_text", "duration_s"],
              },
              minItems: 4,
              maxItems: 6,
            },
            score: { type: "number", description: "0-10, this variant's own real strength." },
            score_rationale: { type: "string" },
          },
          required: ["style", "hook", "beats", "scene_breakdown", "score", "score_rationale"],
        },
      },
    },
    required: ["variants"],
  },
};

function stripVariant(v: ScriptVariant): ScriptVariant {
  return {
    ...v,
    hook: stripMarkdownEmphasis(v.hook),
    beats: {
      setup: stripMarkdownEmphasis(v.beats.setup),
      escalation: stripMarkdownEmphasis(v.beats.escalation),
      payoff: stripMarkdownEmphasis(v.beats.payoff),
      ending: stripMarkdownEmphasis(v.beats.ending),
    },
    scene_breakdown: v.scene_breakdown.map((s) => ({ ...s, visual_description: stripMarkdownEmphasis(s.visual_description) })),
  };
}

function fullScript(v: ScriptVariant): string {
  return [v.hook, v.beats.setup, v.beats.escalation, v.beats.payoff, v.beats.ending].join(" ");
}

export type GenerateScriptsResult =
  | { error: string }
  | { variants: (ScriptVariant & { id: string })[]; selectedId: string };

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
      max_tokens: 3000,
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

    const { variants: rawVariants } = toolUse.input as { variants: ScriptVariant[] };
    if (!rawVariants?.length) return { error: "The AI returned no script variants." as const };

    const variants = rawVariants.map(stripVariant);

    const { data: insertedRows, error: insertError } = await supabase
      .from("content_scripts")
      .insert(
        variants.map((v) => ({
          idea_id: ideaId,
          style: v.style,
          status: "candidate",
          hook: v.hook,
          beats: v.beats,
          full_script: fullScript(v),
          scene_breakdown: v.scene_breakdown,
          score: v.score,
          score_rationale: v.score_rationale,
        }))
      )
      .select("id, style, hook, beats, scene_breakdown, score, score_rationale");
    if (insertError || !insertedRows?.length) {
      console.error("Failed to save script variants:", insertError);
      return { error: "Scripts generated but failed to save." as const };
    }

    // Highest self-assessed score wins; ties keep insertion order (first
    // candidate). Auto-selected, not human-gated — see the file header.
    const winner = insertedRows.reduce((best, row) => ((row.score ?? 0) > (best.score ?? 0) ? row : best), insertedRows[0]);

    await supabase.from("content_scripts").update({ status: "selected", reviewed_at: new Date().toISOString() }).eq("id", winner.id);
    const loserIds = insertedRows.filter((r) => r.id !== winner.id).map((r) => r.id);
    if (loserIds.length) await supabase.from("content_scripts").update({ status: "rejected" }).in("id", loserIds);

    await supabase.from("content_ideas").update({ status: "script_review" }).eq("id", ideaId);

    await logAuditEvent({
      actor: "system",
      actorType: "system",
      action: "content.scripts_generated",
      targetType: "content_idea",
      targetId: ideaId,
      metadata: { count: insertedRows.length, selected_style: winner.style, selected_score: winner.score },
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
      variants: insertedRows as (ScriptVariant & { id: string })[],
      selectedId: winner.id,
    };
  } catch (error) {
    console.error(`Failed to generate scripts for idea ${ideaId}:`, error);
    return { error: "The scripting agent is temporarily unavailable." as const };
  }
}
