import Anthropic from "@anthropic-ai/sdk";
import { runSiteCheck, type SiteCheck } from "@/lib/research-lead";

// The public "Website Health Check" — hamishai.org's own free lead-magnet
// tool, scoped from the free-audit pattern several competitor sites use
// (see the automatethejourney.com research this was pitched from). Reuses
// runSiteCheck() (research-lead.ts) for the free, zero-AI-cost technical
// checks, but everything else here is purpose-built rather than reusing
// research-lead.ts's own AI call: that one is written explicitly to stay
// internal ("never quote this to the business itself"), the opposite of
// what this tool needs — findings written directly to the site owner.

export type AuditGrade = "A" | "B" | "C" | "D" | "F";

export type WebsiteAuditResult = {
  siteCheck: SiteCheck;
  score: number;
  grade: AuditGrade;
  overallImpression: string;
  strengths: string[];
  issues: string[];
  quickWins: string[];
  aiOpportunities: string[];
};

const AUDIT_TOOL: Anthropic.Tool = {
  name: "submit_website_audit",
  description: "Submit the website health check findings, written directly to the business owner.",
  input_schema: {
    type: "object",
    properties: {
      overall_impression: {
        type: "string",
        description: "1-2 plain, direct sentences summarising how the site is doing overall — encouraging where warranted, honest where not.",
      },
      strengths: {
        type: "array",
        items: { type: "string" },
        description: "What the site already does well. Can be empty if genuinely nothing stands out — never invented to seem balanced.",
      },
      issues: {
        type: "array",
        items: { type: "string" },
        description: "Concrete, specific problems found — plain sentences a non-technical owner would understand, not jargon.",
      },
      quick_wins: {
        type: "array",
        items: { type: "string" },
        description: "The easiest, highest-impact fixes — things that could realistically be improved soon.",
      },
      ai_opportunities: {
        type: "array",
        items: { type: "string" },
        description: "Specific, concrete ways AI/automation could help THIS business — never generic AI hype.",
      },
    },
    required: ["overall_impression", "strengths", "issues", "quick_wins", "ai_opportunities"],
  },
};

function buildAuditSystemPrompt(businessName: string | null, siteCheck: SiteCheck, visibleText: string): string {
  return `You are writing a free website health check directly for a small business owner, on behalf of Hamish AI, an Edinburgh-based AI/web consultancy. Write in plain English, second person ("your site", "you"), honest and specific — never generic AI-agency filler, never salesy. Every finding must be grounded in the real data given below; never invent specifics (numbers, dates, competitor names, review counts) that aren't given or literally present in the page text.

${businessName ? `Business name (as given): ${businessName}\n` : ""}
${
  siteCheck.resolves
    ? `Deterministic checks already run (don't re-derive, just use them):
- Loads successfully: yes
- SSL/HTTPS valid: ${siteCheck.ssl_ok === null ? "n/a (not an https site)" : siteCheck.ssl_ok}
- Response time: ${siteCheck.response_ms ?? "n/a"}ms
- Has a contact/booking form: ${siteCheck.has_booking_form}
- Mobile-friendly (viewport meta present): ${siteCheck.mobile_friendly}
- Page title: ${siteCheck.title ?? "none found"}
- Meta description: ${siteCheck.meta_description ?? "none found"}
${siteCheck.redirect_to ? `- Redirects to a different domain: ${siteCheck.redirect_to}` : ""}

${visibleText ? `Visible page text (truncated):\n${visibleText}` : "No page text could be read — base findings on the checks above only, and say so honestly rather than inventing content."}`
    : `This site did not load at all when checked just now. Treat that as the single most important finding, not a technical footnote — a site that doesn't load can't be found, trusted, or booked from by a real customer today. Don't speculate about why it's down; just be direct that this needs fixing first, before anything else on the page matters.`
}

Keep it constructive and specific. A business with a genuinely good site should hear that plainly, not have problems invented to justify the exercise — strengths and issues arrays can be any length, including short, if that's honestly what's there.`;
}

// v1, deliberately transparent and auditable — same "real signal, not a
// tuned black box" philosophy as computeLeadScore() (research-lead.ts).
// A site that doesn't load scores the same low band regardless of
// anything else, matching the prompt's own framing of that as the
// single dominant finding. issueCount comes from the AI call, everything
// else from the free deterministic check.
export function computeAuditScore(siteCheck: SiteCheck, issueCount: number): { score: number; grade: AuditGrade } {
  if (!siteCheck.resolves) return { score: 15, grade: "F" };

  let score = 0;
  if (siteCheck.ssl_ok !== false) score += 20; // true or n/a (non-https URL given) both pass; only an explicit failed check costs points
  if (siteCheck.mobile_friendly) score += 20;
  if (siteCheck.has_booking_form) score += 15;
  if (siteCheck.response_ms !== null && siteCheck.response_ms < 2000) score += 15;
  if (siteCheck.title && siteCheck.meta_description) score += 15;
  // Remaining 15 points from how many real issues the AI found — capped,
  // not linear: past ~5 issues the site is already clearly struggling,
  // and a 6th issue shouldn't matter as much as the gap between 0 and 1.
  score += Math.max(0, 15 - issueCount * 3);

  score = Math.max(0, Math.min(100, score));
  const grade: AuditGrade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : score >= 30 ? "D" : "F";
  return { score, grade };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.length > 0) : [];
}

export async function runWebsiteAudit(url: string, businessName: string | null): Promise<WebsiteAuditResult | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "The audit tool is temporarily unavailable — try again shortly." };

  const { siteCheck, visibleText } = await runSiteCheck(url);

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  let findings: {
    overall_impression?: unknown;
    strengths?: unknown;
    issues?: unknown;
    quick_wins?: unknown;
    ai_opportunities?: unknown;
  };

  try {
    // Forced tool_choice, single tool, no web_search involved — same
    // single-shot structured-output shape as researchLead()'s own main
    // call, which reliably returns a tool_use this way (unlike
    // discover-leads.ts's agentic web_search + tool combination, which
    // needed a forced follow-up nudge because the model could end its
    // turn mid-research; there's no research phase here to end early).
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1200,
      system: buildAuditSystemPrompt(businessName, siteCheck, visibleText),
      tools: [AUDIT_TOOL],
      tool_choice: { type: "tool", name: "submit_website_audit" },
      messages: [{ role: "user", content: "Write the website health check and submit it." }],
    });
    const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUse) return { error: "Couldn't generate your report — please try again." };
    findings = toolUse.input as typeof findings;
  } catch (error) {
    console.error(`Website audit AI call failed for ${url}:`, error);
    return { error: "Couldn't generate your report — please try again." };
  }

  const issues = toStringArray(findings.issues);
  const { score, grade } = computeAuditScore(siteCheck, issues.length);

  return {
    siteCheck,
    score,
    grade,
    overallImpression: typeof findings.overall_impression === "string" ? findings.overall_impression : "",
    strengths: toStringArray(findings.strengths),
    issues,
    quickWins: toStringArray(findings.quick_wins),
    aiOpportunities: toStringArray(findings.ai_opportunities),
  };
}
