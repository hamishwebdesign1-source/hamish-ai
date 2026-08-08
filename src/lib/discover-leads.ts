import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { researchLead } from "@/lib/research-lead";
import { logAuditEvent } from "@/lib/audit-log";

// Larger Feature #10 from docs/leads-automation-plan.md — automates what
// currently happens by hand in a weekly Claude chat session: targeted
// searches per category/area, inserted as needs_verification leads for a
// fast human approval pass, never auto-committed as "ready". Deliberately
// small per run (a handful of area/category pairs, a few web searches
// each) — this is a bounded weekly cost, not a bulk scrape.
//
// Model: Haiku, same as the rest of this codebase's lead-processing calls
// (research-lead.ts, draft-sales-kit.ts) — and load-bearing here, not just
// cost preference: the newer dynamic-filtering web_search tool variant
// only supports Opus/Sonnet-tier models, so Haiku needs the older
// `web_search_20250305` type. Using the newer type with Haiku would 400.

// Real category/neighbourhood values already in the prospects table (see
// the query run when this was built) — keeps discovered leads in the same
// vocabulary as manually-added ones instead of inventing new labels.
const TARGET_CATEGORIES = [
  "Cafe",
  "Restaurant",
  "Trades (Joiner)",
  "Trades (Electrician)",
  "Trades (Plumbing)",
  "Salon",
  "Gym/Fitness Studio",
  "Hotel/B&B",
  "Professional Services (Accountant)",
  "Independent Retailer (Gifts)",
];

const TARGET_AREAS = [
  "Edinburgh",
  "Leith",
  "Morningside",
  "Portobello",
  "Stockbridge",
  "Corstorphine",
  "Falkirk",
  "Stirling",
  "Livingston",
  "Linlithgow",
  "Glasgow - West End",
  "Glasgow - Southside",
];

const PAIRS_PER_RUN = 3;
const MAX_NEW_LEADS_PER_RUN = 12; // safety valve, not expected to bind at PAIRS_PER_RUN=3

type Candidate = {
  business_name: string;
  website?: string;
  phone?: string;
  why_suggested: string;
};

const SUBMIT_CANDIDATES_TOOL: Anthropic.Tool = {
  name: "submit_candidates",
  description: "Submit the small businesses found matching the search.",
  input_schema: {
    type: "object",
    properties: {
      candidates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            business_name: { type: "string" },
            website: { type: "string", description: "Leave out if the business has no findable website." },
            phone: { type: "string", description: "Leave out if not confirmed from a real listing." },
            why_suggested: {
              type: "string",
              description: "One concrete sentence: the specific reason this business is worth outreach — e.g. no website found, only a Facebook page, clearly outdated site.",
            },
          },
          required: ["business_name", "why_suggested"],
        },
      },
    },
    required: ["candidates"],
  },
};

function normaliseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Deterministic, state-free rotation — cycles through the full
// category x area grid a few pairs at a time across weeks, so the same
// combination isn't re-searched every run without needing to persist
// "where we got to" anywhere.
function pickPairsForWeek(weekIndex: number, count: number): { category: string; area: string }[] {
  const allPairs = TARGET_CATEGORIES.flatMap((category) => TARGET_AREAS.map((area) => ({ category, area })));
  const start = (weekIndex * count) % allPairs.length;
  const pairs: { category: string; area: string }[] = [];
  for (let i = 0; i < count; i++) {
    pairs.push(allPairs[(start + i) % allPairs.length]);
  }
  return pairs;
}

function isoWeekIndex(date: Date): number {
  // Not calendar-accurate ISO week numbering — just needs to change by
  // exactly 1 every 7 days so the rotation above advances predictably.
  return Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
}

async function searchCandidates(anthropic: Anthropic, model: string, category: string, area: string): Promise<Candidate[]> {
  const system = `You are researching small, independently-owned businesses for Hamish AI, an Edinburgh-based AI/web consultancy that helps small businesses that are underserved online.

Find 2-4 real, currently-operating small businesses in the "${category}" category in ${area}, Scotland, that appear to have no website at all, or only a very weak one (a bare Facebook page, an unmaintained directory listing, or something clearly outdated). Use web search to confirm each business genuinely exists and check for a working website before including it.

Never invent a business, a website, or a phone number. If you can't confirm a detail, leave it out rather than guess. If you can't find enough businesses that genuinely fit (weak/no web presence), submit fewer — do not pad the list with well-established businesses that already have a good website.`;

  let response = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    system,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }, SUBMIT_CANDIDATES_TOOL],
    messages: [{ role: "user", content: `Find businesses matching the brief above.` }],
  });

  // Server-side web search can hit its internal iteration cap and pause
  // mid-task rather than finish — resend once, unmodified, so the server
  // resumes where it left off (see shared/tool-use-concepts.md — never add
  // a "continue" user message here, the trailing server_tool_use block is
  // what tells the API to resume).
  if (response.stop_reason === "pause_turn") {
    response = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      system,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }, SUBMIT_CANDIDATES_TOOL],
      messages: [
        { role: "user", content: `Find businesses matching the brief above.` },
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

export type DiscoverLeadsResult =
  | { error: string }
  | {
      inserted: { business_name: string; category: string; neighbourhood: string }[];
      skippedDuplicates: string[];
      searchFailures: string[];
      pairsSearched: { category: string; area: string }[];
    };

export async function discoverLeads(): Promise<DiscoverLeadsResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const { data: existing, error: existingError } = await supabase.from("prospects").select("business_name");
  if (existingError) {
    console.error("Failed to fetch existing prospects for dedup:", existingError);
    return { error: "Failed to fetch existing leads." as const };
  }
  const existingNames = new Set((existing ?? []).map((p) => normaliseName(p.business_name)));

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const pairs = pickPairsForWeek(isoWeekIndex(new Date()), PAIRS_PER_RUN);

  const inserted: { business_name: string; category: string; neighbourhood: string }[] = [];
  const skippedDuplicates: string[] = [];
  const searchFailures: string[] = [];

  for (const { category, area } of pairs) {
    if (inserted.length >= MAX_NEW_LEADS_PER_RUN) break;

    let candidates: Candidate[];
    try {
      candidates = await searchCandidates(anthropic, model, category, area);
    } catch (error) {
      console.error(`Lead discovery search failed for ${category} in ${area}:`, error);
      searchFailures.push(`${category} in ${area}`);
      continue;
    }

    for (const candidate of candidates) {
      if (inserted.length >= MAX_NEW_LEADS_PER_RUN) break;
      if (!candidate.business_name) continue;

      const normalised = normaliseName(candidate.business_name);
      if (existingNames.has(normalised)) {
        skippedDuplicates.push(candidate.business_name);
        continue;
      }
      existingNames.add(normalised); // guards against the same name turning up twice in one run

      const { data: lead, error: insertError } = await supabase
        .from("prospects")
        .insert({
          business_name: candidate.business_name,
          category,
          neighbourhood: area,
          website: candidate.website || null,
          phone: candidate.phone || null,
          status: "needs_verification",
          discovery_source: { why_suggested: candidate.why_suggested, search_category: category, search_area: area },
        })
        .select("id")
        .single();

      if (insertError || !lead) {
        console.error(`Failed to insert discovered lead "${candidate.business_name}":`, insertError);
        continue;
      }

      await logAuditEvent({
        actor: "system",
        actorType: "system",
        action: "lead.discovered",
        targetType: "prospect",
        targetId: lead.id,
        metadata: { why_suggested: candidate.why_suggested, search_category: category, search_area: area },
      });

      // Best-effort — most discovered leads have no website (that's the
      // point of the search), and researchLead() correctly errors out
      // rather than doing anything when there's nothing to fetch. Not a
      // failure worth surfacing; the operator researches those manually
      // once they've confirmed a real site exists.
      if (candidate.website) {
        try {
          await researchLead(lead.id);
        } catch (error) {
          console.error(`Post-discovery research failed for lead ${lead.id}:`, error);
        }
      }

      inserted.push({ business_name: candidate.business_name, category, neighbourhood: area });
    }
  }

  return { inserted, skippedDuplicates, searchFailures, pairsSearched: pairs };
}
