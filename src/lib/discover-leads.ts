import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
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

// searchProspectsNow() (below) — a single, immediate, user-triggered
// search rather than PAIRS_PER_RUN's background rotation, so it can
// afford a real result count per click rather than the weekly cron's
// conservative 2-4. Still a deliberate ceiling, not "as many as
// possible": each extra candidate is another real researchLead() call.
const ON_DEMAND_MAX_RESULTS = 10;

type Candidate = {
  business_name: string;
  website?: string;
  phone?: string;
  why_suggested: string;
  // Only ever populated (and only ever trusted) when the search itself
  // had no target category — see searchCandidates()'s own branch for
  // why. A category-scoped search already knows the category; asking
  // the model to also report it back would just be re-deriving
  // something the caller supplied.
  category?: string;
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
            category: {
              type: "string",
              description:
                "What kind of business this is (e.g. 'Independent Cafe', 'Hair Salon'). Only include this if the search brief did not already name a target category — when it did, leave this out.",
            },
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
//
// Capped at allPairs.length, not just `count` — a tenant with one
// category and one area (a single-pair grid) used to get that identical
// pair pushed three times in one run (count=3, allPairs.length=1, every
// index mod 1 is 0), burning two-thirds of the run on a guaranteed
// duplicate of the same search instead of ever trying anything else.
// HamishAI's own much larger grid (10 categories x 12 areas) is
// unaffected — count (3) was already well under allPairs.length (120).
function pickPairsForWeek(
  categories: string[],
  areas: string[],
  weekIndex: number,
  count: number
): { category: string; area: string }[] {
  const allPairs = categories.flatMap((category) => areas.map((area) => ({ category, area })));
  if (allPairs.length === 0) return [];
  const start = (weekIndex * count) % allPairs.length;
  const uniqueCount = Math.min(count, allPairs.length);
  const pairs: { category: string; area: string }[] = [];
  for (let i = 0; i < uniqueCount; i++) {
    pairs.push(allPairs[(start + i) % allPairs.length]);
  }
  return pairs;
}

function isoWeekIndex(date: Date): number {
  // Not calendar-accurate ISO week numbering — just needs to change by
  // exactly 1 every 7 days so the rotation above advances predictably.
  return Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
}

// category is nullable — searchProspectsNow() (below) is the "search by
// location only" path, where the model itself is asked to find and
// report a category per business rather than being given one. options
// defaults reproduce discoverLeads()'s original always-had behaviour
// exactly (2-4 results, 5 searches) so its own call site below didn't
// need to change; searchProspectsNow() passes its own, larger numbers —
// a single deliberate on-demand search can afford a real result count
// in a way the weekly background rotation's per-pair budget can't.
async function searchCandidates(
  anthropic: Anthropic,
  model: string,
  orgName: string,
  category: string | null,
  area: string,
  options: { minResults: number; maxResults: number; maxSearchUses: number } = { minResults: 2, maxResults: 4, maxSearchUses: 5 }
): Promise<Candidate[]> {
  // orgName and area both come from the caller, not hardcoded — this used
  // to say "for Hamish AI, an Edinburgh-based AI/web consultancy" and
  // append ", Scotland" onto every single area regardless of what the
  // area actually was. That was fine while this only ever ran for
  // HamishAI's own Central Belt Scotland searches; the moment a real
  // tenant entered "Kent" as their area, the prompt actually sent was
  // "gyms category in Kent, Scotland" — a place that doesn't exist,
  // which is exactly why that search returned almost nothing. The area
  // string is trusted as-is now; a tenant who needs to disambiguate a
  // place name can just write "Kent, England" or "Leeds, UK" themselves.
  const brief = category
    ? `Find ${options.minResults}-${options.maxResults} real, currently-operating small businesses in the "${category}" category in ${area}, that appear to have no website at all, or only a very weak one (a bare Facebook page, an unmaintained directory listing, or something clearly outdated).`
    : `Find ${options.minResults}-${options.maxResults} real, currently-operating small independent businesses in ${area}, that appear to have no website at all, or only a very weak one (a bare Facebook page, an unmaintained directory listing, or something clearly outdated). No target category was given, so pick a genuine mix of everyday, non-touristy categories yourself — trades (plumbers, electricians, joiners), personal services (hairdressers, barbers, beauticians), local food (takeaways, cafes, chippies), and similar small local businesses. Avoid businesses likely to appear in a tourism or "best independent shops" guide — those tend to already have a strong web presence, which is the opposite of what this search is for. For each business, report what kind of business it is in the "category" field.`;

  const system = `You are researching small, independently-owned businesses on behalf of ${orgName}, an AI/web consultancy that helps small businesses that are underserved online.

${brief} Use web search to confirm each business genuinely exists and check for a working website before including it. Take the area given literally and don't substitute a different location if you can't immediately place it — search for it as written.

Never invent a business, a website, or a phone number. If you can't confirm a detail, leave it out rather than guess. If you can't find enough businesses that genuinely fit (weak/no web presence), submit fewer — do not pad the list with well-established businesses that already have a good website.`;

  let response = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    system,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: options.maxSearchUses }, SUBMIT_CANDIDATES_TOOL],
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
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: options.maxSearchUses }, SUBMIT_CANDIDATES_TOOL],
      messages: [
        { role: "user", content: `Find businesses matching the brief above.` },
        { role: "assistant", content: response.content },
      ],
    });
  }

  let toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "submit_candidates"
  );

  // Confirmed live (not a hypothetical): the model can spend its entire
  // web_search budget genuinely researching, conclude it found little or
  // nothing solid, and then just explain that in a text block instead of
  // ever calling submit_candidates — even though the brief explicitly
  // says submitting fewer (including zero) is fine. Without this, that
  // reads as "found 0" indistinguishable from a real empty result, when
  // it's actually the model never answering at all. One forced follow-up
  // — web_search dropped (the research phase is over either way) and
  // tool_choice pinned to submit_candidates — makes it actually submit
  // whatever it already found, even if that's nothing.
  if (!toolUse) {
    const nudge = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      system,
      tools: [SUBMIT_CANDIDATES_TOOL],
      tool_choice: { type: "tool", name: "submit_candidates" },
      messages: [
        { role: "user", content: `Find businesses matching the brief above.` },
        { role: "assistant", content: response.content },
        {
          role: "user",
          content:
            "Call submit_candidates now with exactly the businesses you found that genuinely fit, even if that's fewer than asked for or an empty list. Do not apologize or explain in text — just call the tool.",
        },
      ],
    });
    toolUse = nudge.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "submit_candidates"
    );
  }

  if (!toolUse) return [];

  const input = toolUse.input as { candidates: Candidate[] };
  return input.candidates ?? [];
}

// Shared by discoverLeads() (one call per rotated category/area pair)
// and searchProspectsNow() (one call for a single on-demand search) —
// same dedup/insert/usage-accounting/research/audit sequence either
// way, extracted so the two call sites can't quietly drift (e.g. one
// path forgetting the researchLead() call the other keeps).
//
// remainingBudget is this call's own insert ceiling (how many more
// candidates from *this* batch may be inserted), not a global one — the
// caller is responsible for shrinking it call to call if it's looping
// over multiple batches, same as monthlyRemainingFromHere below.
// monthlyRemainingFromHere is how many of *this batch's* inserts (0-
// indexed from the start of this call) still fall within the org's
// monthly plan allowance before spending a purchased credit instead —
// the caller computes this from its own running total, not from a
// number this function tracks itself.
async function insertCandidates(
  supabase: SupabaseClient,
  orgId: string,
  isInternal: boolean,
  candidates: Candidate[],
  category: string | null,
  area: string,
  existingNames: Set<string>,
  remainingBudget: number,
  monthlyRemainingFromHere: number
): Promise<{
  inserted: { business_name: string; category: string; neighbourhood: string }[];
  skippedDuplicates: string[];
  creditsUsed: number;
}> {
  const inserted: { business_name: string; category: string; neighbourhood: string }[] = [];
  const skippedDuplicates: string[] = [];
  let creditsUsed = 0;

  for (const candidate of candidates) {
    if (inserted.length >= remainingBudget) break;
    if (!candidate.business_name) continue;

    const normalised = normaliseName(candidate.business_name);
    if (existingNames.has(normalised)) {
      skippedDuplicates.push(candidate.business_name);
      continue;
    }
    existingNames.add(normalised); // guards against the same name turning up twice in one run

    // A category-scoped search already knows its category; a
    // location-only search relies on the model's own per-candidate
    // report instead (see searchCandidates()'s "category" tool field).
    // Genuinely uncategorised only when neither is present, which
    // prospects.category (nullable, schema-leads.sql) already allows.
    const resolvedCategory = category ?? candidate.category ?? null;

    const { data: lead, error: insertError } = await supabase
      .from("prospects")
      .insert({
        org_id: orgId,
        business_name: candidate.business_name,
        category: resolvedCategory,
        neighbourhood: area,
        website: candidate.website || null,
        phone: candidate.phone || null,
        status: "needs_verification",
        discovery_source: { why_suggested: candidate.why_suggested, search_category: resolvedCategory, search_area: area },
      })
      .select("id")
      .single();

    if (insertError || !lead) {
      console.error(`Failed to insert discovered lead "${candidate.business_name}":`, insertError);
      continue;
    }

    if (!isInternal) {
      // inserted.length here is this batch's own count *before* this
      // candidate is pushed below — the caller already accounted for
      // any earlier batches in the monthlyRemainingFromHere it passed in.
      if (inserted.length < monthlyRemainingFromHere) {
        await recordUsageEvent(orgId, "prospect_researched");
      } else {
        creditsUsed++;
      }
    }

    await logAuditEvent({
      actor: "system",
      actorType: "system",
      action: "lead.discovered",
      targetType: "prospect",
      targetId: lead.id,
      metadata: { why_suggested: candidate.why_suggested, search_category: resolvedCategory, search_area: area },
    });

    // Best-effort, unconditional — every discovered lead gets a research
    // pass regardless of whether it has a website (see research-lead.ts's
    // own comment on why "no website at all" is the strongest possible
    // finding, not a skip condition).
    try {
      await researchLead(lead.id);
    } catch (error) {
      console.error(`Post-discovery research failed for lead ${lead.id}:`, error);
    }

    inserted.push({ business_name: candidate.business_name, category: resolvedCategory ?? "", neighbourhood: area });
  }

  return { inserted, skippedDuplicates, creditsUsed };
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
      // Set when a non-internal org has never saved a niche
      // (categories/areas) — see the comment where this is checked for
      // why silently falling back to HamishAI's own Central Belt
      // Scotland defaults for a real tenant was never actually correct.
      nicheRequired?: boolean;
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
    .select("name, prospecting_config, is_internal, plan, subscription_status, trial_ends_at, purchased_prospect_credits")
    .eq("id", orgId)
    .single();
  if (orgError || !org) {
    console.error("Failed to load organisation for lead discovery:", orgError);
    return { error: "Organisation not found." as const };
  }
  const config = (org.prospecting_config ?? {}) as { categories?: string[]; areas?: string[] };

  // DEFAULT_CATEGORIES/DEFAULT_AREAS are HamishAI's own Central Belt
  // Scotland rotation, not a generic placeholder — falling back to them
  // for a real tenant with no saved niche silently ran their "find
  // prospects" click against Edinburgh/Falkirk/Glasgow accountants and
  // cafes regardless of what business they actually run. Only the
  // internal org gets that fallback now; every other org with no
  // categories/areas saved gets told to set one, not handed someone
  // else's config.
  if (!org.is_internal && (!config.categories?.length || !config.areas?.length)) {
    return { inserted: [], skippedDuplicates: [], searchFailures: [], pairsSearched: [], nicheRequired: true };
  }
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
  //
  // Purchased top-up credits (schema-prospect-credits.sql) extend this
  // ceiling rather than replacing it: monthlyRemaining is always spent
  // first, credits only cover the overflow. The first `monthlyRemaining`
  // prospects inserted this run record a real usage_events row (below);
  // anything past that draws down purchased_prospect_credits instead, via
  // creditsUsedThisRun — a single atomic decrement after the loop, not one
  // DB write per prospect.
  let maxInsertsThisRun = MAX_NEW_LEADS_PER_RUN;
  let monthlyRemaining = Number.POSITIVE_INFINITY;
  let creditsAvailable = 0;
  if (!org.is_internal) {
    const usage = await getUsageStatus(orgId, "prospect_researched", org.plan as PlatformPlanSlug);
    monthlyRemaining = usage.remaining;
    creditsAvailable = org.purchased_prospect_credits ?? 0;
    if (!usage.allowed && creditsAvailable <= 0) {
      return {
        inserted: [],
        skippedDuplicates: [],
        searchFailures: [],
        pairsSearched: [],
        limitReached: { used: usage.used, limit: usage.limit },
      };
    }
    maxInsertsThisRun = Math.min(MAX_NEW_LEADS_PER_RUN, monthlyRemaining + creditsAvailable);
  }
  let creditsUsedThisRun = 0;

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
      candidates = await searchCandidates(anthropic, model, org.name, category, area);
    } catch (error) {
      console.error(`Lead discovery search failed for ${category} in ${area}:`, error);
      searchFailures.push(`${category} in ${area}`);
      continue;
    }

    // monthlyRemaining minus what's already been inserted from earlier
    // pairs this run — see insertCandidates()'s own comment on why it
    // takes this pre-computed, per-batch number rather than tracking a
    // running total itself.
    const result = await insertCandidates(
      supabase,
      orgId,
      org.is_internal,
      candidates,
      category,
      area,
      existingNames,
      maxInsertsThisRun - inserted.length,
      Math.max(0, monthlyRemaining - inserted.length)
    );
    inserted.push(...result.inserted);
    skippedDuplicates.push(...result.skippedDuplicates);
    creditsUsedThisRun += result.creditsUsed;
  }

  // Single atomic decrement for the whole run (not one write per
  // prospect) — same increment_prospect_credits() RPC the Stripe webhook
  // uses to credit a purchase, called here with a negative amount so
  // there's one atomic-update code path for this balance, not two.
  if (creditsUsedThisRun > 0) {
    const { error: decrementError } = await supabase.rpc("increment_prospect_credits", { p_org_id: orgId, p_amount: -creditsUsedThisRun });
    if (decrementError) console.error(`Failed to decrement prospect credits for org ${orgId}:`, decrementError);
  }

  return { inserted, skippedDuplicates, searchFailures, pairsSearched: pairs };
}

// Location-only (or location + category) on-demand search — the direct
// "search this, right now" action discoverLeads() never actually was:
// that function re-runs an org's *saved* categories/areas through a
// rotation, 3 pairs at a time, with no way to target one specific
// query. This runs exactly one real, immediate search and returns as
// soon as it's done — same billing/usage/dedup/insert/research rules as
// discoverLeads() (this is still spending real prospect_researched
// quota, or purchased credits past it), just for a caller-specified
// location instead of a rotated pair, and a real result count (see
// ON_DEMAND_MAX_RESULTS) since a single deliberate click can afford
// more than the weekly background rotation's conservative per-pair cap.
export async function searchProspectsNow(orgId: string, location: string, category: string | null): Promise<DiscoverLeadsResult> {
  const trimmedLocation = location.trim();
  if (!trimmedLocation) return { error: "Enter a location to search." as const };
  const trimmedCategory = category?.trim() || null;

  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const { data: org, error: orgError } = await supabase
    .from("organisations")
    .select("name, is_internal, plan, subscription_status, trial_ends_at, purchased_prospect_credits")
    .eq("id", orgId)
    .single();
  if (orgError || !org) {
    console.error("Failed to load organisation for on-demand prospect search:", orgError);
    return { error: "Organisation not found." as const };
  }

  // Same billing/usage rules as discoverLeads() — see that function's
  // own comments for why each of these checks exists and in this order.
  if (!org.is_internal) {
    const billingOk = org.subscription_status === "active" || (org.subscription_status === "trialing" && new Date(org.trial_ends_at) > new Date());
    if (!billingOk) {
      return { inserted: [], skippedDuplicates: [], searchFailures: [], pairsSearched: [], billingRequired: true };
    }
  }

  let maxInsertsThisRun = ON_DEMAND_MAX_RESULTS;
  let monthlyRemaining = Number.POSITIVE_INFINITY;
  let creditsAvailable = 0;
  if (!org.is_internal) {
    const usage = await getUsageStatus(orgId, "prospect_researched", org.plan as PlatformPlanSlug);
    monthlyRemaining = usage.remaining;
    creditsAvailable = org.purchased_prospect_credits ?? 0;
    if (!usage.allowed && creditsAvailable <= 0) {
      return {
        inserted: [],
        skippedDuplicates: [],
        searchFailures: [],
        pairsSearched: [],
        limitReached: { used: usage.used, limit: usage.limit },
      };
    }
    maxInsertsThisRun = Math.min(ON_DEMAND_MAX_RESULTS, monthlyRemaining + creditsAvailable);
  }

  const { data: existing, error: existingError } = await supabase.from("prospects").select("business_name").eq("org_id", orgId);
  if (existingError) {
    console.error("Failed to fetch existing prospects for dedup:", existingError);
    return { error: "Failed to fetch existing leads." as const };
  }
  const existingNames = new Set((existing ?? []).map((p) => normaliseName(p.business_name)));

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  let candidates: Candidate[];
  try {
    candidates = await searchCandidates(anthropic, model, org.name, trimmedCategory, trimmedLocation, {
      minResults: Math.min(6, ON_DEMAND_MAX_RESULTS),
      maxResults: ON_DEMAND_MAX_RESULTS,
      maxSearchUses: 10,
    });
  } catch (error) {
    console.error(`On-demand prospect search failed for ${trimmedCategory ?? "any category"} in ${trimmedLocation}:`, error);
    return {
      inserted: [],
      skippedDuplicates: [],
      searchFailures: [`${trimmedCategory ?? "Any category"} in ${trimmedLocation}`],
      pairsSearched: [],
    };
  }

  const result = await insertCandidates(
    supabase,
    orgId,
    org.is_internal,
    candidates,
    trimmedCategory,
    trimmedLocation,
    existingNames,
    maxInsertsThisRun,
    monthlyRemaining
  );

  if (result.creditsUsed > 0) {
    const { error: decrementError } = await supabase.rpc("increment_prospect_credits", { p_org_id: orgId, p_amount: -result.creditsUsed });
    if (decrementError) console.error(`Failed to decrement prospect credits for org ${orgId}:`, decrementError);
  }

  return {
    inserted: result.inserted,
    skippedDuplicates: result.skippedDuplicates,
    searchFailures: [],
    pairsSearched: [{ category: trimmedCategory ?? "Any category", area: trimmedLocation }],
  };
}
