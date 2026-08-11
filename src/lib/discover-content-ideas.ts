import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { researchContentIdea } from "@/lib/research-content-idea";
import { logAuditEvent } from "@/lib/audit-log";

// Content Factory MVP Phase A (docs/content-factory-plan.md) — the
// discovery stage, modeled directly on discover-leads.ts: Haiku (forced by
// the older web_search_20250305 tool type — the newer dynamic-filtering
// variant only supports Opus/Sonnet-tier models, so Haiku would 400 on
// it), deterministic topic rotation (no search-state table needed), dedupe
// via a Set built once, a safety valve, and best-effort chaining into
// research for each inserted idea (same "one bad idea shouldn't sink the
// run" reasoning as discover-leads.ts).

const TOPIC_ROTATION = [
  "AI tools and productivity",
  "Small business / solopreneur life",
  "Money and personal finance myths",
  "Tech and gadget curiosities",
  "History's stranger facts",
  "Psychology and human behaviour",
  "Science explained simply",
  "Internet/tech culture moments",
];

const TOPICS_PER_RUN = 3;
const MAX_NEW_IDEAS_PER_RUN = 8; // safety valve, not expected to bind at TOPICS_PER_RUN=3

type Candidate = {
  title: string;
  concept: string;
  why_suggested: string;
};

const SUBMIT_CANDIDATES_TOOL: Anthropic.Tool = {
  name: "submit_candidates",
  description: "Submit the short-form video ideas found for this topic.",
  input_schema: {
    type: "object",
    properties: {
      candidates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "A short working title, not a final script hook." },
            concept: { type: "string", description: "One or two sentences: the actual premise/angle of the video." },
            why_suggested: {
              type: "string",
              description: "One concrete sentence: why this is worth making right now — a real trend, a genuinely underused angle, a strong curiosity gap, etc.",
            },
          },
          required: ["title", "concept", "why_suggested"],
        },
      },
    },
    required: ["candidates"],
  },
};

function normaliseTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Deterministic, state-free rotation — same shape as pickPairsForWeek in
// discover-leads.ts, cycles through the topic list a few at a time across
// weeks without needing to persist "where we got to" anywhere.
function pickTopicsForWeek(weekIndex: number, count: number): string[] {
  const start = (weekIndex * count) % TOPIC_ROTATION.length;
  const topics: string[] = [];
  for (let i = 0; i < count; i++) topics.push(TOPIC_ROTATION[(start + i) % TOPIC_ROTATION.length]);
  return topics;
}

function isoWeekIndex(date: Date): number {
  // Not calendar-accurate ISO week numbering — just needs to change by
  // exactly 1 every 7 days so the rotation above advances predictably.
  return Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
}

async function searchCandidates(anthropic: Anthropic, model: string, topic: string): Promise<Candidate[]> {
  const system = `You are finding short-form video ideas (YouTube Shorts / TikTok, 15-60 seconds) for an AI/tech-adjacent content channel, in the "${topic}" space.

Find 2-4 genuinely strong ideas — real trending angles, questions people are actively asking, or curiosity-driven/contrarian takes with real hook potential. Use web search to check what's actually current/trending right now rather than guessing. Do not pad the list with generic, overdone ideas ("5 tips for X") just to hit a count — submit fewer if that's all that genuinely fits the bar.`;

  let response = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    system,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }, SUBMIT_CANDIDATES_TOOL],
    messages: [{ role: "user", content: "Find ideas matching the brief above." }],
  });

  // Server-side web search can hit its internal iteration cap and pause
  // mid-task rather than finish — resend once, unmodified, so the server
  // resumes where it left off (identical handling to discover-leads.ts's
  // searchCandidates — never add a synthetic "continue" user message here).
  if (response.stop_reason === "pause_turn") {
    response = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      system,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }, SUBMIT_CANDIDATES_TOOL],
      messages: [
        { role: "user", content: "Find ideas matching the brief above." },
        { role: "assistant", content: response.content },
      ],
    });
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "submit_candidates"
  );
  if (!toolUse) return [];

  const input = toolUse.input as { candidates: Candidate[] };
  return input.candidates ?? [];
}

export type DiscoverContentIdeasResult =
  | { error: string }
  | {
      inserted: { title: string; topic: string }[];
      skippedDuplicates: string[];
      searchFailures: string[];
      topicsSearched: string[];
    };

export async function discoverContentIdeas(): Promise<DiscoverContentIdeasResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const { data: existing, error: existingError } = await supabase.from("content_ideas").select("title");
  if (existingError) {
    console.error("Failed to fetch existing content ideas for dedup:", existingError);
    return { error: "Failed to fetch existing ideas." as const };
  }
  const existingTitles = new Set((existing ?? []).map((i) => normaliseTitle(i.title)));

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const topics = pickTopicsForWeek(isoWeekIndex(new Date()), TOPICS_PER_RUN);

  const inserted: { title: string; topic: string }[] = [];
  const skippedDuplicates: string[] = [];
  const searchFailures: string[] = [];

  for (const topic of topics) {
    if (inserted.length >= MAX_NEW_IDEAS_PER_RUN) break;

    let candidates: Candidate[];
    try {
      candidates = await searchCandidates(anthropic, model, topic);
    } catch (error) {
      console.error(`Content idea discovery search failed for "${topic}":`, error);
      searchFailures.push(topic);
      continue;
    }

    for (const candidate of candidates) {
      if (inserted.length >= MAX_NEW_IDEAS_PER_RUN) break;
      if (!candidate.title || !candidate.concept) continue;

      const normalised = normaliseTitle(candidate.title);
      if (existingTitles.has(normalised)) {
        skippedDuplicates.push(candidate.title);
        continue;
      }
      existingTitles.add(normalised); // guards against the same title turning up twice in one run

      const { data: idea, error: insertError } = await supabase
        .from("content_ideas")
        .insert({
          title: candidate.title,
          concept: candidate.concept,
          topic,
          status: "new",
          source: "ai",
          discovery_source: { why_suggested: candidate.why_suggested, search_topic: topic },
        })
        .select("id")
        .single();

      if (insertError || !idea) {
        console.error(`Failed to insert discovered idea "${candidate.title}":`, insertError);
        continue;
      }

      await logAuditEvent({
        actor: "system",
        actorType: "system",
        action: "content.idea_discovered",
        targetType: "content_idea",
        targetId: idea.id,
        metadata: { why_suggested: candidate.why_suggested, search_topic: topic },
      });

      // Best-effort — one bad research call shouldn't take down the rest
      // of the run, same reasoning as discover-leads.ts chaining into
      // researchLead().
      try {
        await researchContentIdea(idea.id);
      } catch (error) {
        console.error(`Post-discovery research failed for idea ${idea.id}:`, error);
      }

      inserted.push({ title: candidate.title, topic });
    }
  }

  return { inserted, skippedDuplicates, searchFailures, topicsSearched: topics };
}
