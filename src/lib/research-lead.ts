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

export type LeadResearch = {
  site_check: SiteCheck;
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

// v1, deliberately simple and auditable rather than tuned — a transparent
// formula beats an opaque one until there's real outcome data (which leads
// actually convert) to fit a better one against. Broken domain is the
// single strongest signal (mirrors what the manual research process has
// been treating as the strongest opener all along); everything else is
// one point each, capped at 5.
export function computeLeadScore(siteCheck: SiteCheck, aiOpportunityFit: LeadResearch["ai_opportunity_fit"]): number {
  let points = 0;
  if (!siteCheck.resolves) {
    points += 2;
  } else {
    if (siteCheck.ssl_ok === false) points += 1;
    if (!siteCheck.has_booking_form) points += 1;
    if (!siteCheck.mobile_friendly) points += 1;
  }
  if (aiOpportunityFit === "high") points += 1;
  return Math.max(0, Math.min(5, points));
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

function buildSystemPrompt(lead: {
  business_name: string;
  category: string | null;
  neighbourhood: string | null;
  signal: string | null;
  outreach_note: string | null;
}, siteCheck: SiteCheck, visibleText: string) {
  return `You are researching a small business as a lead-qualification step for Hamish AI, a small Edinburgh-based AI/web consultancy. Everything you produce is for INTERNAL prioritisation only — estimated figures must never be treated as fact or quoted to the business itself; only concrete, sourced observations belong in actual outreach copy.

Business: ${lead.business_name} (${lead.category || "unknown category"}, ${lead.neighbourhood || "unknown location"})
${lead.signal ? `Previously recorded signal: ${lead.signal}` : ""}
${lead.outreach_note ? `Previously recorded outreach note: ${lead.outreach_note}` : ""}

Deterministic site-check results (already run, don't re-derive):
- Domain resolves: ${siteCheck.resolves}
- SSL valid: ${siteCheck.ssl_ok === null ? "n/a" : siteCheck.ssl_ok}
- Response time: ${siteCheck.response_ms ?? "n/a"}ms
- Has a booking/contact form: ${siteCheck.has_booking_form}
- Mobile-friendly (viewport meta present): ${siteCheck.mobile_friendly}
- Page title: ${siteCheck.title ?? "none found"}
- Meta description: ${siteCheck.meta_description ?? "none found"}
${siteCheck.redirect_to ? `- Redirects to a different domain: ${siteCheck.redirect_to}` : ""}

${visibleText ? `Visible page text (truncated):\n${visibleText}` : "No page text could be fetched — base findings on the site-check results and business name/category only, and say so honestly rather than inventing content."}

Never invent specific facts (prices, review counts, awards, years trading) beyond what's given above or literally present in the page text. Every estimate (project value, conversion probability, AI opportunity fit) is a rough band for Hamish's own prioritisation, not a claim about the business.`;
}

export async function researchLead(leadId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: lead, error: leadError } = await supabase
    .from("prospects")
    .select("business_name, category, neighbourhood, website, signal, outreach_note")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) return { error: "Lead not found." as const };
  if (!lead.website) return { error: "This lead has no website on file to research." as const };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const { siteCheck, visibleText } = await runSiteCheck(lead.website);

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

    const findings = toolUse.input as Omit<LeadResearch, "site_check">;
    const research: LeadResearch = { site_check: siteCheck, ...findings };
    const score = computeLeadScore(siteCheck, findings.ai_opportunity_fit);
    const generatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("prospects")
      .update({ research, research_generated_at: generatedAt, score })
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
