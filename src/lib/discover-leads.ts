import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { researchLead } from "@/lib/research-lead";
import { logAuditEvent } from "@/lib/audit-log";
import { getUsageStatus, recordUsageEvent } from "@/lib/usage-limits";
import type { PlatformPlanSlug } from "@/lib/platform-plans";

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
//
// Used as a fallback only, for an organisation with no prospecting_config
// of its own yet (a brand-new Agency Platform signup mid-onboarding).
// HamishAI's own organisation has this exact list — value for value — in
// its prospecting_config column as of
// schema-fix-internal-org-prospecting-config.sql, so its weekly cron reads
// the same categories/areas it always has; the constants stay here only as
// the default a new org starts from, not as HamishAI's actual source of
// truth anymore.
const DEFAULT_CATEGORIES = [
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

const DEFAULT_AREAS = [
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
function pickPairsForWeek(
  categories: string[],
  areas: string[],
  weekIndex: number,
  count: number
): { category: string; area: string }[] {
  const allPairs = categories.flatMap((category) => areas.map((area) => ({ category, area })));
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
      // Set when a non-internal org's monthly plan limit stopped this run
      // before it searched everything it otherwise would have — distinct
      // from `error`, since this isn't a failure, it's the cap working as
      // designed. undefined for a run that wasn't limited.
      limitReached?: { used: number; limit: number };
      // Set when a non-internal org has no active subscription and its
      // trial has ended — checked before limitReached, since these need
      // different messages ("subscribe" vs "wait until next month").
      billingRequired?: boolean;
    };

// orgId is required, not defaulted — a cron or Server Action calling this
// must say explicitly which organisation it's discovering for, the same
// "explicit over implicit" call made everywhere else org_id shows up in
// this codebase (see schema-backfill-internal-org.sql's own reasoning for
// why the column default exists but application code shouldn't lean on
// it). /api/cron/lead-discovery passes HAMISHAI_ORG_ID explicitly; a
// future /studio "find prospects" action passes the signed-in org's own id.
export async function discoverLeads(orgId: string): Promise<DiscoverLeadsResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const { data: org, error: orgError } = await supabase
    .from("organisations")
    .select("prospecting_config, is_internal, plan, subscription_status, trial_ends_at")
    .eq("id", orgId)
    .single();
  if (orgError || !org) {
    console.error("Failed to load organisation for lead discovery:", orgError);
    return { error: "Organisation not found." as const };
  }
  const config = (org.prospecting_config ?? {}) as { categories?: string[]; areas?: string[] };
  const categories = config.categories?.length ? config.categories : DEFAULT_CATEGORIES;
  const areas = config.areas?.length ? config.areas : DEFAULT_AREAS;

  // Checked before usage (a lapsed trial should say "subscribe," not
  // "you've hit your limit" — a more useful and more honest message).
  // HamishAI's own organisation is exempt (subscription_status was set to
  // 'active' once, at is_internal = true, in
  // schema-platform-billing.sql) — the same is_internal branch every
  // other billing/usage check in this function already uses, not a
  // separate special case.
  if (!org.is_internal) {
    const billingOk = org.subscription_status === "active" || (org.subscription_status === "trialing" && new Date(org.trial_ends_at) > new Date());
    if (!billingOk) {
      return { inserted: [], skippedDuplicates: [], searchFailures: [], pairsSearched: [], billingRequired: true };
    }
  }

  // HamishAI's own organisation is never capped (see usage-limits.ts's own
  // comment on why that's the caller's job, not getUsageStatus()'s). For
  // every paying org, a plan's "up to N prospects a month" becomes a real
  // ceiling here rather than just pricing-page copy — checked once before
  // the run starts, so a request against an already-exhausted month never
  // spends a single Claude call.
  let maxInsertsThisRun = MAX_NEW_LEADS_PER_RUN;
  if (!org.is_internal) {
    const usage = await getUsageStatus(orgId, "prospect_researched", org.plan as PlatformPlanSlug);
    if (!usage.allowed) {
      return {
        inserted: [],
        skippedDuplicates: [],
        searchFailures: [],
        pairsSearched: [],
        limitReached: { used: usage.used, limit: usage.limit },
      };
    }
    maxInsertsThisRun = Math.min(MAX_NEW_LEADS_PER_RUN, usage.remaining);
  }

  // Scoped to this org only — an org's own dedup must never treat another
  // org's prospects (e.g. HamishAI's own ~100+ rows) as already-found,
  // which is what an unscoped select here would have done the moment a
  // second organisation started using this function.
  const { data: existing, error: existingError } = await supabase
    .from("prospects")
    .select("business_name")
    .eq("org_id", orgId);
  if (existingError) {
    console.error("Failed to fetch existing prospects for dedup:", existingError);
    return { error: "Failed to fetch existing leads." as const };
  }
  const existingNames = new Set((existing ?? []).map((p) => normaliseName(p.business_name)));

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const pairs = pickPairsForWeek(categories, areas, isoWeekIndex(new Date()), PAIRS_PER_RUN);

  const inserted: { business_name: string; category: string; neighbourhood: string }[] = [];
  const skippedDuplicates: string[] = [];
  const searchFailures: string[] = [];

  for (const { category, area } of pairs) {
    if (inserted.length >= maxInsertsThisRun) break;

    let candidates: Candidate[];
    try {
      candidates = await searchCandidates(anthropic, model, category, area);
    } catch (error) {
      console.error(`Lead discovery search failed for ${category} in ${area}:`, error);
      searchFailures.push(`${category} in ${area}`);
      continue;
    }

    for (const candidate of candidates) {
      if (inserted.length >= maxInsertsThisRun) break;
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
          org_id: orgId,
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

      if (!org.is_internal) await recordUsageEvent(orgId, "prospect_researched");

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
