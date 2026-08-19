import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSslInfo } from "@/lib/site-monitor";
import { logAuditEvent } from "@/lib/audit-log";

// High Impact #6/#7 from docs/leads-automation-plan.md — replaces the old
// hand-typed signal/outreach_note process with one cached research pass:
//
// Phase 1 (0 tokens): a deterministic site-check, same pattern as
// site-monitor.ts's runSiteCheck (reuses its getSslInfo directly) —
// resolves, SSL, response time, has a booking/contact form, a mobile
// viewport meta tag, page title/meta description.
//
// Phase 2 (1 Claude call, Haiku, tool-forced JSON — same shape as
// draft-lead-email.ts): everything the "AI Research" and "AI
// Recommendations" sections of the plan asked for, in one prompt.
//
// Result is cached to `research` + `research_generated_at` and never
// regenerated except by an explicit "Re-research" click (see
// generateLeadResearch in admin/actions.ts) — no LLM call is ever
// triggered by rendering a page.

export type SiteCheck = {
  website: string;
  resolves: boolean;
  ssl_ok: boolean | null;
  response_ms: number | null;
  has_booking_form: boolean;
  mobile_friendly: boolean;
  title: string | null;
  meta_description: string | null;
  redirect_to: string | null;
};

// Deep research pipeline Phase 1 — a deeper sales-strategy breakdown on
// top of suggested_sales_angle/pursue_because, only generated when the
// lead already has a concept page (see fetchConceptPageText below): a
// meeting-ready expansion, not a duplicate of the one-line angle.
export type SalesStrategy = {
  why_this_lead_matters: string;
  key_pain_points: string[];
  discovery_questions: string[];
  // Each string is one "Objection: … — Response: …" pair, not a nested
  // {objection, response} object — the array-of-objects shape reliably
  // confused Haiku's forced tool output (it started emitting pseudo-XML
  // instead of real JSON for this field specifically, and neighbouring
  // fields in the same call); a flat string array is the shape every
  // other field on this call handles correctly.
  likely_objections: string[];
  recommended_offer: string;
};

// Deep research pipeline Phase 1 — compares the concept page Hamish
// already built against the lead's real current site. `show_them_this` is
// the sales-demo checklist the brief asks for, in walkthrough order.
export type ConceptPageAnalysis = {
  problems_solved: string[];
  strongest_improvements: string[];
  show_them_this: string[];
  features_to_highlight: string[];
  features_to_avoid_mentioning: string[];
  suggested_additions: string[];
};

export type LeadResearch = {
  // Absent, not a placeholder "checked and failed" object, when the lead
  // has no website at all — see researchLead()'s no-website branch. A
  // real distinction: "we tried to check this domain and it's broken" and
  // "there is no domain to check" are different findings, not the same
  // one with a missing value.
  site_check?: SiteCheck;
  business_summary: string;
  services: string[];
  strengths: string[];
  weaknesses: string[];
  seo_observations: string[];
  missing_trust_signals: string[];
  missing_conversion_opportunities: string[];
  ai_opportunities: string[];
  recommended_services: string[];
  suggested_sales_angle: string;
  estimated_project_value_band: string;
  conversion_probability_band: "low" | "medium" | "high";
  ai_opportunity_fit: "low" | "medium" | "high";
  pursue_because: string;
  // Both only present when the lead has a concept page — see
  // buildSystemPrompt's conceptPageText branch.
  sales_strategy?: SalesStrategy;
  concept_page_analysis?: ConceptPageAnalysis;
};

// Same messy free-text `website` field the rest of the leads page works
// around (e.g. "site.co.uk (redirected from old.co.uk)") — first
// whitespace-delimited token, https by default. See websiteHref() in the
// leads page for the identical one-liner.
function normaliseWebsite(website: string): string {
  const first = website.trim().split(/\s+/)[0];
  return first.startsWith("http") ? first : `https://${first}`;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function runSiteCheck(website: string): Promise<{ siteCheck: SiteCheck; visibleText: string }> {
  const url = normaliseWebsite(website);
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return {
      siteCheck: {
        website: url,
        resolves: false,
        ssl_ok: null,
        response_ms: null,
        has_booking_form: false,
        mobile_friendly: false,
        title: null,
        meta_description: null,
        redirect_to: null,
      },
      visibleText: "",
    };
  }

  const start = Date.now();
  let resolves = false;
  let responseMs: number | null = null;
  let html = "";
  let redirectTo: string | null = null;

  try {
    const res = await fetch(urlObj.toString(), { signal: AbortSignal.timeout(8000), redirect: "follow" });
    responseMs = Date.now() - start;
    resolves = res.ok;
    html = await res.text();
    if (res.url && new URL(res.url).hostname !== urlObj.hostname) redirectTo = res.url;
  } catch (error) {
    console.error(`Research site-check fetch failed for ${url}:`, error);
  }

  const ssl = urlObj.protocol === "https:" ? await getSslInfo(urlObj.hostname) : { ok: null, validUntil: null };

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const metaMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const viewportMatch = /<meta\s+name=["']viewport["']/i.test(html);
  const hasForm = /<form[\s>]/i.test(html);

  return {
    siteCheck: {
      website: url,
      resolves,
      ssl_ok: ssl.ok,
      response_ms: responseMs,
      has_booking_form: hasForm,
      mobile_friendly: viewportMatch,
      title: titleMatch?.[1]?.trim().slice(0, 200) ?? null,
      meta_description: metaMatch?.[1]?.trim().slice(0, 300) ?? null,
      redirect_to: redirectTo,
    },
    visibleText: html ? stripTags(html).slice(0, 3000) : "",
  };
}

// Deep research pipeline Phase 1 — concept pages are hand-authored static
// Next.js route files, not something with a readable "content" column
// anywhere, so the only way to see what one actually says is to fetch the
// real deployed page and strip it down the same way runSiteCheck() does
// for the lead's own site. Fetching the live production URL (not a
// dev/localhost origin — same hardcoded-domain convention as
// self-monitor.ts's SELF_URL) is also the more honest choice: it's
// exactly what a prospect would see clicking the link in the drafted
// outreach email, and by the time an admin links a concept_slug the page
// has always already been built, committed, and deployed.
async function fetchConceptPageText(slug: string): Promise<string> {
  try {
    const res = await fetch(`https://www.hamishai.org/concepts/${slug}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return "";
    const html = await res.text();
    return stripTags(html).slice(0, 4000);
  } catch (error) {
    console.error(`Failed to fetch concept page "${slug}":`, error);
    return "";
  }
}

// v1, deliberately simple and auditable rather than tuned — a transparent
// formula beats an opaque one until there's real outcome data (which leads
// actually convert) to fit a better one against. Broken domain is the
// single strongest signal (mirrors what the manual research process has
// been treating as the strongest opener all along); everything else is
// one point each, capped at 5. No website at all (siteCheck === null)
// scores the same as a domain that doesn't resolve — both mean "nothing
// online to point to," the strongest version of this signal, not a weaker
// one just because there was no domain to even attempt.
export function computeLeadScore(siteCheck: SiteCheck | null, aiOpportunityFit: LeadResearch["ai_opportunity_fit"]): number {
  let points = 0;
  if (!siteCheck || !siteCheck.resolves) {
    points += 2;
  } else {
    if (siteCheck.ssl_ok === false) points += 1;
    if (!siteCheck.has_booking_form) points += 1;
    if (!siteCheck.mobile_friendly) points += 1;
  }
  if (aiOpportunityFit === "high") points += 1;
  return Math.max(0, Math.min(5, points));
}

// The multi-dimensional breakdown behind the single score above —
// computeLeadScore() itself is left completely untouched (it's a live,
// hand-tuned formula /admin/leads already sorts and filters by; changing
// what it returns would silently change behaviour nobody asked to
// change). This is a second, additive computation over the same
// already-generated research, not a replacement, and costs no new AI
// call: every input already exists in LeadResearch by the time this runs.
export type ScoreBreakdown = {
  fit: number; // 1-5 — how well ai_opportunity_fit rates this business for what the org sells
  need: number; // 1-5 — how many concrete problems the research actually found
  value: number; // 1-5 — from the estimated project value band
  confidence: number; // 1-5 — how much of this is real observed evidence vs. inferred from a name and category alone
  overall: number; // 1-5 — plain average of the four, not a tuned weighting (same "transparent over opaque" reasoning as computeLeadScore)
};

const VALUE_BAND_SCORE: Record<string, number> = {
  "£500-£1,500": 1,
  "£1,500-£3,000": 2,
  "£3,000-£6,000": 4,
  "£6,000+": 5,
};

export function computeScoreBreakdown(siteCheck: SiteCheck | null, research: Omit<LeadResearch, "site_check" | "sales_strategy" | "concept_page_analysis">): ScoreBreakdown {
  const fit = research.ai_opportunity_fit === "high" ? 5 : research.ai_opportunity_fit === "medium" ? 3 : 1;

  // A count of concrete, named problems, not a judgment call — the same
  // "auditable over tuned" principle as computeLeadScore.
  const needSignals = research.weaknesses.length + research.missing_trust_signals.length + research.missing_conversion_opportunities.length;
  const need = Math.max(1, Math.min(5, Math.round(needSignals / 2)));

  const value = VALUE_BAND_SCORE[research.estimated_project_value_band] ?? 3;

  // Deliberately the inverse of computeLeadScore's own "no website is the
  // strongest finding" logic: that's true for need (a business with
  // nothing online has a real, obvious problem), but the opposite is true
  // for confidence — with no site to check, everything except the
  // business's name and category is inferred, not observed, so this
  // dimension is honest about there being less to verify, not less to
  // worry about.
  const confidence = !siteCheck ? 2 : siteCheck.resolves ? 5 : 3;

  const overall = Math.round((fit + need + value + confidence) / 4);

  return { fit, need, value, confidence, overall };
}

const RESEARCH_TOOL: Anthropic.Tool = {
  name: "submit_lead_research",
  description: "Submit the researched findings for this business.",
  input_schema: {
    type: "object",
    properties: {
      business_summary: { type: "string", description: "1-2 plain sentences on what the business does." },
      services: { type: "array", items: { type: "string" }, description: "Services/products offered, from the page text." },
      strengths: { type: "array", items: { type: "string" }, description: "What the current site/business does well." },
      weaknesses: { type: "array", items: { type: "string" }, description: "Concrete, specific problems found." },
      seo_observations: { type: "array", items: { type: "string" } },
      missing_trust_signals: { type: "array", items: { type: "string" }, description: "e.g. no reviews shown, no address, no accreditation badges." },
      missing_conversion_opportunities: { type: "array", items: { type: "string" }, description: "e.g. no booking form, no clear call-to-action." },
      ai_opportunities: { type: "array", items: { type: "string" }, description: "Concrete ways an AI assistant/automation could help this specific business." },
      recommended_services: { type: "array", items: { type: "string" }, description: "Which Hamish AI service(s) fit best (redesign, AI chat assistant, booking system, etc.)." },
      suggested_sales_angle: { type: "string", description: "The single strongest, most specific opening line for outreach." },
      estimated_project_value_band: {
        type: "string",
        enum: ["£500-£1,500", "£1,500-£3,000", "£3,000-£6,000", "£6,000+"],
        description: "Rough band only, for internal prioritisation - never to be stated to the prospect.",
      },
      conversion_probability_band: { type: "string", enum: ["low", "medium", "high"] },
      ai_opportunity_fit: { type: "string", enum: ["low", "medium", "high"], description: "How well an AI-assistant pitch specifically fits this business." },
      pursue_because: { type: "string", description: "One sentence: 'This business is likely worth pursuing because...'" },
    },
    required: [
      "business_summary",
      "services",
      "strengths",
      "weaknesses",
      "seo_observations",
      "missing_trust_signals",
      "missing_conversion_opportunities",
      "ai_opportunities",
      "recommended_services",
      "suggested_sales_angle",
      "estimated_project_value_band",
      "conversion_probability_band",
      "ai_opportunity_fit",
      "pursue_because",
    ],
  },
};

// Deep research pipeline Phase 1 — sales_strategy/concept_page_analysis
// were originally one combined call (then one call with two nested
// required objects). Both were unreliable the same way: whichever of two
// large required objects shared a single forced tool call, Claude Haiku
// would reliably fill one and silently drop the other — observed with
// both pairings, so it isn't one specific object being "harder", it's two
// large required objects competing in one call. Two fully separate,
// flat-schema, single-purpose calls fixes it — costs one extra Haiku call
// on concept-linked leads only (2 total instead of 1), still well inside
// Phase 1's "a couple of calls, no new web-search cost" budget.
const SALES_STRATEGY_TOOL: Anthropic.Tool = {
  name: "submit_sales_strategy",
  description: "Submit the meeting-ready sales strategy for this lead.",
  input_schema: {
    type: "object",
    properties: {
      why_this_lead_matters: { type: "string", minLength: 1 },
      key_pain_points: { type: "array", items: { type: "string" }, minItems: 1 },
      discovery_questions: {
        type: "array",
        items: { type: "string" },
        description: "Questions to ask this specific business during a meeting.",
        minItems: 1,
      },
      likely_objections: {
        type: "array",
        items: { type: "string" },
        description: "One string per objection, formatted as 'Objection: <text> — Response: <text>'.",
        minItems: 1,
      },
      recommended_offer: { type: "string", description: "The specific Hamish AI service(s) to propose.", minLength: 1 },
    },
    required: ["why_this_lead_matters", "key_pain_points", "discovery_questions", "likely_objections", "recommended_offer"],
  },
};

const CONCEPT_PAGE_ANALYSIS_TOOL: Anthropic.Tool = {
  name: "submit_concept_page_analysis",
  description: "Submit the concept-page analysis, comparing it against the business's real current site.",
  input_schema: {
    type: "object",
    properties: {
      problems_solved: { type: "array", items: { type: "string" }, minItems: 1 },
      strongest_improvements: { type: "array", items: { type: "string" }, minItems: 1 },
      show_them_this: {
        type: "array",
        items: { type: "string" },
        description: "A short sales-demo checklist, in the order to walk through it. Each string is one step — do not prefix them with your own numbers, they're rendered as a numbered list already.",
        minItems: 1,
      },
      features_to_highlight: { type: "array", items: { type: "string" }, minItems: 1 },
      // Legitimately can be empty (e.g. nothing on the concept page needs
      // holding back yet) — no minItems on these two.
      features_to_avoid_mentioning: { type: "array", items: { type: "string" }, description: "Anything not ready or convincing enough to bring up yet." },
      suggested_additions: { type: "array", items: { type: "string" }, description: "What could be added to the concept page before pitching, if anything." },
    },
    required: ["problems_solved", "strongest_improvements", "show_them_this", "features_to_highlight"],
  },
};

function buildSystemPrompt(lead: {
  business_name: string;
  category: string | null;
  neighbourhood: string | null;
  signal: string | null;
  outreach_note: string | null;
}, siteCheck: SiteCheck | null, visibleText: string) {
  return `You are researching a small business as a lead-qualification step for Hamish AI, a small Edinburgh-based AI/web consultancy. Everything you produce is for INTERNAL prioritisation only — estimated figures must never be treated as fact or quoted to the business itself; only concrete, sourced observations belong in actual outreach copy.

Business: ${lead.business_name} (${lead.category || "unknown category"}, ${lead.neighbourhood || "unknown location"})
${lead.signal ? `Previously recorded signal: ${lead.signal}` : ""}
${lead.outreach_note ? `Previously recorded outreach note: ${lead.outreach_note}` : ""}

${
  siteCheck
    ? `Deterministic site-check results (already run, don't re-derive):
- Domain resolves: ${siteCheck.resolves}
- SSL valid: ${siteCheck.ssl_ok === null ? "n/a" : siteCheck.ssl_ok}
- Response time: ${siteCheck.response_ms ?? "n/a"}ms
- Has a booking/contact form: ${siteCheck.has_booking_form}
- Mobile-friendly (viewport meta present): ${siteCheck.mobile_friendly}
- Page title: ${siteCheck.title ?? "none found"}
- Meta description: ${siteCheck.meta_description ?? "none found"}
${siteCheck.redirect_to ? `- Redirects to a different domain: ${siteCheck.redirect_to}` : ""}

${visibleText ? `Visible page text (truncated):\n${visibleText}` : "No page text could be fetched — base findings on the site-check results and business name/category only, and say so honestly rather than inventing content."}`
    : `This business has no website on file at all — there is nothing to site-check, and that absence is itself the strongest, most concrete finding here: a business with zero online presence is a business that cannot be found, booked, or verified by a prospective customer today. Treat "no website" as the primary weakness and the primary AI/web opportunity, not as missing data to work around. Base every other finding on the business name, category, neighbourhood, and any recorded signal/outreach note only — say so honestly rather than inventing specifics a real site might have shown.`
}

Never invent specific facts (prices, review counts, awards, years trading) beyond what's given above or literally present in the page text. Every estimate (project value, conversion probability, AI opportunity fit) is a rough band for Hamish's own prioritisation, not a claim about the business.`;
}

// Deep research pipeline Phase 1 — the second, focused call (see
// CONCEPT_ANALYSIS_TOOL above for why this is separate from the main
// research call). Passes the main call's own conclusions (weaknesses,
// AI opportunities, sales angle) as context so this call's sales
// strategy builds on them instead of re-reasoning from scratch.
function buildConceptAnalysisPrompt(
  lead: { business_name: string; category: string | null; neighbourhood: string | null },
  baseFindings: Pick<LeadResearch, "weaknesses" | "ai_opportunities" | "suggested_sales_angle" | "pursue_because">,
  conceptPageText: string,
  conceptSlug: string
) {
  return `You are building a meeting-ready sales strategy for Hamish AI, a small Edinburgh-based AI/web consultancy, for one specific lead. Everything you produce is for INTERNAL prioritisation only.

Business: ${lead.business_name} (${lead.category || "unknown category"}, ${lead.neighbourhood || "unknown location"})

Research already done on this business:
- Weaknesses found: ${baseFindings.weaknesses.join("; ") || "none recorded"}
- AI opportunities identified: ${baseFindings.ai_opportunities.join("; ") || "none recorded"}
- Suggested sales angle: ${baseFindings.suggested_sales_angle}
- Why pursue: ${baseFindings.pursue_because}

Hamish has already built this business a personalised concept page at https://www.hamishai.org/concepts/${conceptSlug} — a live, working preview of what their site could look like, built specifically for them. Its visible content (truncated):
${conceptPageText}

Compare the concept page directly against the business's real situation above, and build a sales strategy Hamish can walk into a meeting with. Never invent specific facts beyond what's given here or literally present in the concept page text.`;
}

// Counts how many of `keys` are meaningfully present (non-empty string/
// array) on a tool-call result — used below to detect when Haiku has
// silently dropped some of a forced tool call's own required fields.
// Observed directly: even a single-object, single-purpose forced call
// sometimes comes back with only 1 of 5 required fields filled — schema
// `required`/minLength/minItems aren't a hard guarantee with this model,
// just a strong hint. One retry is cheap insurance against that, not
// something schema tweaking alone reliably fixes.
function countPresentKeys(obj: Record<string, unknown> | null, keys: string[]): number {
  if (!obj) return 0;
  return keys.filter((k) => {
    const v = obj[k];
    return Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.length > 0 : v != null;
  }).length;
}

async function callToolOnce<T extends Record<string, unknown>>(
  anthropic: Anthropic,
  model: string,
  system: string,
  tool: Anthropic.Tool,
  userMessage: string
): Promise<T | null> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 1000,
    system,
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
    messages: [{ role: "user", content: userMessage }],
  });
  const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
  return (toolUse?.input as T | undefined) ?? null;
}

async function callToolWithRetry<T extends Record<string, unknown>>(
  anthropic: Anthropic,
  model: string,
  system: string,
  tool: Anthropic.Tool,
  userMessage: string,
  requiredKeys: string[],
  context: string
): Promise<T | null> {
  try {
    const first = await callToolOnce<T>(anthropic, model, system, tool, userMessage);
    if (countPresentKeys(first, requiredKeys) >= requiredKeys.length) return first;

    console.warn(`${context} returned incomplete data (${countPresentKeys(first, requiredKeys)}/${requiredKeys.length} fields) — retrying once.`);
    const retry = await callToolOnce<T>(anthropic, model, system, tool, userMessage);
    return countPresentKeys(retry, requiredKeys) > countPresentKeys(first, requiredKeys) ? retry : first;
  } catch (error) {
    console.error(`${context} failed:`, error);
    return null;
  }
}

// Two separate forced-tool calls sharing one system prompt — see
// SALES_STRATEGY_TOOL's comment for why these aren't one call. Run in
// parallel: they're independent of each other, both read-only reasoning
// over the same context, no reason to pay the latency of running them
// sequentially.
async function analyzeConceptPageFit(
  anthropic: Anthropic,
  model: string,
  lead: { business_name: string; category: string | null; neighbourhood: string | null },
  baseFindings: Pick<LeadResearch, "weaknesses" | "ai_opportunities" | "suggested_sales_angle" | "pursue_because">,
  conceptPageText: string,
  conceptSlug: string
): Promise<Pick<LeadResearch, "sales_strategy" | "concept_page_analysis">> {
  const system = buildConceptAnalysisPrompt(lead, baseFindings, conceptPageText, conceptSlug);

  const [salesStrategy, conceptPageAnalysis] = await Promise.all([
    callToolWithRetry<SalesStrategy>(
      anthropic,
      model,
      system,
      SALES_STRATEGY_TOOL,
      "Build the sales strategy and submit it.",
      ["why_this_lead_matters", "key_pain_points", "discovery_questions", "likely_objections", "recommended_offer"],
      `Sales-strategy call for "${lead.business_name}"`
    ),
    callToolWithRetry<ConceptPageAnalysis>(
      anthropic,
      model,
      system,
      CONCEPT_PAGE_ANALYSIS_TOOL,
      "Build the concept-page analysis and submit it.",
      ["problems_solved", "strongest_improvements", "show_them_this", "features_to_highlight"],
      `Concept-page-analysis call for "${lead.business_name}"`
    ),
  ]);

  return {
    ...(salesStrategy ? { sales_strategy: salesStrategy } : {}),
    ...(conceptPageAnalysis ? { concept_page_analysis: conceptPageAnalysis } : {}),
  };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.length > 0) : [];
}

function toSafeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// Final safety net before anything reaches the database or the UI —
// even with the retry-once layer above, a field can still come back the
// wrong JS type (an array field as a plain string, observed directly in
// testing). Coercing here means every consumer of LeadResearch — the DB,
// the lead detail page, research-lead-button.tsx — can trust its
// TypeScript types are actually true, instead of each one needing its
// own defensive checks against a `.map()` crash on a string.
function sanitizeSalesStrategy(raw: SalesStrategy | undefined): SalesStrategy | undefined {
  if (!raw) return undefined;
  const sanitized: SalesStrategy = {
    why_this_lead_matters: toSafeString(raw.why_this_lead_matters),
    key_pain_points: toStringArray(raw.key_pain_points),
    discovery_questions: toStringArray(raw.discovery_questions),
    likely_objections: toStringArray(raw.likely_objections),
    recommended_offer: toSafeString(raw.recommended_offer),
  };
  // If most of it came back empty after coercion, it's not worth saving
  // at all — an almost-blank card is worse than no card.
  const filledCount =
    [sanitized.why_this_lead_matters, sanitized.recommended_offer].filter(Boolean).length +
    [sanitized.key_pain_points, sanitized.discovery_questions, sanitized.likely_objections].filter((a) => a.length > 0).length;
  return filledCount >= 3 ? sanitized : undefined;
}

function sanitizeConceptPageAnalysis(raw: ConceptPageAnalysis | undefined): ConceptPageAnalysis | undefined {
  if (!raw) return undefined;
  const sanitized: ConceptPageAnalysis = {
    problems_solved: toStringArray(raw.problems_solved),
    strongest_improvements: toStringArray(raw.strongest_improvements),
    show_them_this: toStringArray(raw.show_them_this),
    features_to_highlight: toStringArray(raw.features_to_highlight),
    features_to_avoid_mentioning: toStringArray(raw.features_to_avoid_mentioning),
    suggested_additions: toStringArray(raw.suggested_additions),
  };
  const filledCount = [
    sanitized.problems_solved,
    sanitized.strongest_improvements,
    sanitized.show_them_this,
    sanitized.features_to_highlight,
  ].filter((a) => a.length > 0).length;
  return filledCount >= 3 ? sanitized : undefined;
}

export async function researchLead(leadId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: lead, error: leadError } = await supabase
    .from("prospects")
    .select("business_name, category, neighbourhood, website, signal, outreach_note, concept_slug")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) return { error: "Lead not found." as const };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  // Phase 8 finding #1 (docs/lily-golf-test-project.md): this used to hard-
  // refuse any lead with no website on file — exactly the businesses that
  // most need Hamish AI (no online presence at all) were the ones this
  // tool was worst at researching. siteCheck/visibleText are null/empty
  // rather than skipped-with-a-placeholder — buildSystemPrompt() and
  // computeLeadScore() both branch on that explicitly rather than being
  // handed a fake "checked and it's broken" result.
  const { siteCheck, visibleText } = lead.website
    ? await runSiteCheck(lead.website)
    : { siteCheck: null, visibleText: "" };
  // Best-effort — a concept page that fails to fetch just means
  // sales_strategy/concept_page_analysis get omitted this run, not a
  // reason to fail the whole research pass.
  const conceptPageText = lead.concept_slug ? await fetchConceptPageText(lead.concept_slug) : "";

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1200,
      system: buildSystemPrompt(lead, siteCheck, visibleText),
      tools: [RESEARCH_TOOL],
      tool_choice: { type: "tool", name: "submit_lead_research" },
      messages: [{ role: "user", content: "Research this business and submit your findings." }],
    });

    const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    if (!toolUse) return { error: "The AI did not return research." as const };

    const findings = toolUse.input as Omit<LeadResearch, "site_check" | "sales_strategy" | "concept_page_analysis">;
    let research: LeadResearch = { ...(siteCheck ? { site_check: siteCheck } : {}), ...findings };

    // Two more calls, only when a concept page exists — see
    // SALES_STRATEGY_TOOL's comment for why these are split out rather
    // than folded into one bigger call. Best-effort: either or both
    // failing still leaves a complete, useful base research result saved.
    if (conceptPageText && lead.concept_slug) {
      const conceptAnalysis = await analyzeConceptPageFit(anthropic, model, lead, findings, conceptPageText, lead.concept_slug);
      const salesStrategy = sanitizeSalesStrategy(conceptAnalysis.sales_strategy);
      const conceptPageAnalysis = sanitizeConceptPageAnalysis(conceptAnalysis.concept_page_analysis);
      research = {
        ...research,
        ...(salesStrategy ? { sales_strategy: salesStrategy } : {}),
        ...(conceptPageAnalysis ? { concept_page_analysis: conceptPageAnalysis } : {}),
      };
    }

    const score = computeLeadScore(siteCheck, findings.ai_opportunity_fit);
    const scoreBreakdown = computeScoreBreakdown(siteCheck, findings);
    const generatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("prospects")
      .update({ research, research_generated_at: generatedAt, score, score_breakdown: scoreBreakdown })
      .eq("id", leadId);
    if (updateError) {
      console.error("Failed to save lead research:", updateError);
      return { error: "Research completed but failed to save." as const };
    }

    await logAuditEvent({
      actor: "admin",
      action: "lead.researched",
      targetType: "prospect",
      targetId: leadId,
      metadata: { score, ai_opportunity_fit: findings.ai_opportunity_fit, pursue_because: findings.pursue_because },
    });

    return { research, score, generatedAt };
  } catch (error) {
    console.error(`Failed to research lead ${leadId}:`, error);
    return { error: "The research agent is temporarily unavailable." as const };
  }
}
