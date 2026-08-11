import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit-log";
import { generateContentScripts } from "@/lib/generate-content-scripts";

// Content Factory MVP Phase A (docs/content-factory-plan.md) — the
// research + scoring stage, modeled directly on research-lead.ts's shape:
// one tool-forced Haiku call, cached as a single jsonb blob + generated_at
// timestamp, never regenerated except an explicit "Re-research" click.
// Unlike research-lead.ts there's no deterministic zero-token phase first
// (there's no "site" to check for a content idea) — this is a single AI
// call reasoning over the idea's own title/concept/topic.

export type ContentIdeaResearch = {
  trend_validation: string; // is this actually a live trend/angle right now, or a stale one?
  audience_fit: string; // who specifically this resonates with and why
  competitor_examples: string[]; // similar content that's worked, if the model is aware of any — AI inference, not a verified fact; kept general in the prompt for that reason
  differentiation: string; // what would make this specific take stand out
  risk_notes: string[]; // anything that could flop, mislead, or needs a factual-accuracy warning
  suggested_angle: string; // the single strongest, most specific angle to script from
  novelty: "low" | "medium" | "high";
  competition_level: "low" | "medium" | "high"; // how saturated this angle already is
  production_difficulty: "low" | "medium" | "high";
  evergreen_value: "low" | "medium" | "high"; // still relevant in 6 months, or a one-week trend?
};

export type IdeaScoreBreakdown = {
  novelty_points: number;
  competition_points: number;
  production_points: number;
  evergreen_points: number;
};

// Real reliability finding, confirmed via a live test run (two ideas both
// scored 0/5 regardless of actual quality): despite the tool schema
// declaring `enum: ["low","medium","high"]`, Haiku routinely returns a
// qualified phrase instead of the bare word — e.g.
// "medium-to-high (the general concept is old; but this specific case is
// genuinely underexplored)" — which fails a strict `=== "high"` check and
// silently fell through to 0 for every band, systematically killing the
// score gate. Same category of issue research-lead.ts already documents
// for this model (schema `enum`/`required` are a strong hint, not a
// guarantee) — same fix shape: sanitize before trusting it, rather than
// assume the schema was honoured.
function normaliseBand(value: unknown): "low" | "medium" | "high" {
  const text = String(value ?? "").toLowerCase();
  const mentions = [...text.matchAll(/\b(low|medium|high)\b/g)].map((m) => m[1]);
  // A hedge like "low-to-medium (no direct saturation on this story, but
  // moderate noise in the broader category)" reads, in full, as leaning
  // toward whichever band comes last — take the final mention rather than
  // the first.
  const last = mentions[mentions.length - 1];
  return last === "high" || last === "medium" || last === "low" ? last : "medium"; // neutral, not 0-scoring, default when nothing parses
}

// v1, deliberately simple and auditable rather than tuned — same
// philosophy as computeLeadScore in research-lead.ts: a transparent
// formula beats an opaque one until there's real published-video outcome
// data to fit a better one against. Four 0-2 bands summed then rescaled
// onto the same familiar 0-5 scale prospects.score already uses. Accepts
// unnormalised band values directly (the raw model output before
// sanitizeResearch runs) so this stays a pure function callable on its
// own, same as computeLeadScore.
export function computeIdeaScore(research: ContentIdeaResearch): { score: number; breakdown: IdeaScoreBreakdown } {
  const highMedLow = (band: string) => (normaliseBand(band) === "high" ? 2 : normaliseBand(band) === "medium" ? 1 : 0);
  // Inverted — low competition and low production difficulty are the good
  // outcomes here, unlike novelty/evergreen where high is good.
  const lowIsGood = (band: string) => (normaliseBand(band) === "low" ? 2 : normaliseBand(band) === "medium" ? 1 : 0);

  const breakdown: IdeaScoreBreakdown = {
    novelty_points: highMedLow(research.novelty),
    competition_points: lowIsGood(research.competition_level),
    production_points: lowIsGood(research.production_difficulty),
    evergreen_points: highMedLow(research.evergreen_value),
  };
  const total = breakdown.novelty_points + breakdown.competition_points + breakdown.production_points + breakdown.evergreen_points;
  return { score: Math.max(0, Math.min(5, Math.round((total / 8) * 5))), breakdown };
}

// Second reliability finding from the same live test run: despite
// `type: "array", items: {type: "string"}`, Haiku sometimes collapses the
// whole array into one plain string (competitor_examples came back as a
// single paragraph, not a list) — crashed ContentIdeaResearchButton's
// `.map()` outright. Unlike a strict filter-only coercion (which would
// silently discard that entire paragraph), wrapping a lone string as a
// single-element array preserves it — the content itself was fine, only
// the shape was wrong.
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string" && v.length > 0);
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}

// Cleans the four band fields to their strict enum value and the two
// array fields to a real array before anything is saved or rendered — the
// Badge chips and `.map()` calls on the review UI assume these shapes. No
// nuance is actually lost: the qualifying detail the band hedges carried
// already lives in trend_validation/differentiation, which stay untouched.
function sanitizeResearch(raw: ContentIdeaResearch): ContentIdeaResearch {
  return {
    ...raw,
    novelty: normaliseBand(raw.novelty),
    competition_level: normaliseBand(raw.competition_level),
    production_difficulty: normaliseBand(raw.production_difficulty),
    evergreen_value: normaliseBand(raw.evergreen_value),
    competitor_examples: toStringArray(raw.competitor_examples),
    risk_notes: toStringArray(raw.risk_notes),
  };
}

// Below this, an idea is auto-rejected right after research — the primary
// cost gate (see docs/content-factory-plan.md's cost-control section):
// weak ideas never reach script generation, let alone a ViewMax spend.
export const MIN_SCORE_TO_PROCEED = 3;

const RESEARCH_TOOL: Anthropic.Tool = {
  name: "submit_idea_research",
  description: "Submit the researched findings for this short-form video idea.",
  input_schema: {
    type: "object",
    properties: {
      trend_validation: { type: "string", description: "Is this angle actually live/current right now, or already stale?" },
      audience_fit: { type: "string", description: "Who specifically this resonates with and why." },
      competitor_examples: {
        type: "array",
        items: { type: "string" },
        description: "Similar content/formats that have worked, if you're aware of any — general patterns, not fabricated specifics.",
      },
      differentiation: { type: "string", description: "What would make this specific take stand out from what's already out there." },
      risk_notes: { type: "array", items: { type: "string" }, description: "Anything that could flop, mislead, or needs a factual-accuracy warning." },
      suggested_angle: { type: "string", description: "The single strongest, most specific angle to script this from." },
      novelty: { type: "string", enum: ["low", "medium", "high"], description: "EXACTLY the single word low, medium, or high — no qualifiers, no parentheses. Put any nuance in trend_validation or differentiation instead." },
      competition_level: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "How saturated this angle already is. EXACTLY the single word low, medium, or high — no qualifiers, no parentheses.",
      },
      production_difficulty: { type: "string", enum: ["low", "medium", "high"], description: "EXACTLY the single word low, medium, or high — no qualifiers, no parentheses." },
      evergreen_value: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Still relevant in 6 months, or a one-week trend? EXACTLY the single word low, medium, or high — no qualifiers, no parentheses.",
      },
    },
    required: [
      "trend_validation",
      "audience_fit",
      "competitor_examples",
      "differentiation",
      "risk_notes",
      "suggested_angle",
      "novelty",
      "competition_level",
      "production_difficulty",
      "evergreen_value",
    ],
  },
};

function buildSystemPrompt(idea: { title: string; concept: string; topic: string | null }): string {
  return `You are researching a short-form video idea (YouTube Shorts / TikTok, 15-60 seconds) for Hamish AI's content channel, as a qualification step before any script or video gets produced. Everything here is INTERNAL prioritisation — be honest and specific, not encouraging by default. Most ideas should score in the middle; reserve "high" ratings for genuinely strong signals.

Idea title: ${idea.title}
Concept/hook: ${idea.concept}
${idea.topic ? `Topic: ${idea.topic}` : ""}

Assess this idea on its real merits: is the trend/angle actually live right now or already stale, who specifically it would resonate with, what's already been done in this space (competitor_examples is your best general inference, not a verified fact — describe patterns rather than naming specific creators/videos you can't be confident are real), what would make this specific take stand out, and anything genuinely risky (factually shaky claims, an over-used format, easy to get wrong). Never invent specific statistics, sources, or named creators/videos you can't be confident about.

For novelty, competition_level, production_difficulty, and evergreen_value: answer with EXACTLY one word — low, medium, or high. Never write a hedge like "medium-to-high" or add a parenthetical justification in those four fields specifically — any nuance belongs in trend_validation or differentiation instead, where there's room for it.`;
}

export async function researchContentIdea(ideaId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: idea, error: ideaError } = await supabase
    .from("content_ideas")
    .select("title, concept, topic")
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
      max_tokens: 1000,
      system: buildSystemPrompt(idea),
      tools: [RESEARCH_TOOL],
      tool_choice: { type: "tool", name: "submit_idea_research" },
      messages: [{ role: "user", content: "Research this idea and submit your findings." }],
    });

    const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    if (!toolUse) return { error: "The AI did not return research." as const };

    const research = sanitizeResearch(toolUse.input as ContentIdeaResearch);
    const { score, breakdown } = computeIdeaScore(research);
    const generatedAt = new Date().toISOString();
    const rejected = score < MIN_SCORE_TO_PROCEED;

    const update: Record<string, unknown> = {
      research,
      research_generated_at: generatedAt,
      score,
      score_breakdown: breakdown,
      status: rejected ? "rejected" : "researched",
    };
    if (rejected) {
      update.rejected_reason = `Auto-rejected — scored ${score}/5, below the ${MIN_SCORE_TO_PROCEED}/5 threshold to proceed to scripting.`;
      update.rejected_at = generatedAt;
    }

    const { error: updateError } = await supabase.from("content_ideas").update(update).eq("id", ideaId);
    if (updateError) {
      console.error("Failed to save idea research:", updateError);
      return { error: "Research completed but failed to save." as const };
    }

    await logAuditEvent({
      actor: "admin",
      action: "content.idea_researched",
      targetType: "content_idea",
      targetId: ideaId,
      metadata: { score, novelty: research.novelty, competition_level: research.competition_level, rejected },
    });

    // Best-effort — a researched idea that clears the score gate chains
    // straight into script generation, same "one bad downstream call
    // shouldn't undo a good upstream result" reasoning as
    // discover-content-ideas.ts chaining into research. Rejected ideas
    // never reach this — the primary cost gate (see MIN_SCORE_TO_PROCEED).
    if (!rejected) {
      try {
        await generateContentScripts(ideaId);
      } catch (error) {
        console.error(`Post-research script generation failed for idea ${ideaId}:`, error);
      }
    }

    return { research, score, breakdown, rejected, generatedAt };
  } catch (error) {
    console.error(`Failed to research content idea ${ideaId}:`, error);
    return { error: "The research agent is temporarily unavailable." as const };
  }
}
