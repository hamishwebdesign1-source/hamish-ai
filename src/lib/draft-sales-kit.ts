import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { siteConfig } from "@/lib/site-config";
import { matchCaseStudy } from "@/lib/match-case-study";
import { logAuditEvent } from "@/lib/audit-log";
import type { LeadResearch } from "@/lib/research-lead";
import type { AgencyType } from "@/lib/agency-types";

// High Impact #8 from docs/leads-automation-plan.md — one Claude call
// instead of six. Replaces the old draft-lead-email.ts (2 calls: initial +
// follow-up) and draft-lead-call-script.ts (1 call), each of which paid
// its own system-prompt tokens separately; this generates all six outreach
// artifacts (initial email, follow-up email, call script, LinkedIn
// message, meeting agenda, proposal outline) in a single tool-forced call
// and caches the result the same way research-lead.ts does — `sales_kit` +
// `sales_kit_generated_at`, never regenerated except by an explicit
// "Re-generate" click.
//
// Uses the cached `research` jsonb (see research-lead.ts) as its primary
// context when available — one research pass already paid for, reused
// here instead of re-derived — and falls back to the older free-text
// signal/outreach_note fields for leads that haven't been researched yet.

export type SalesKit = {
  outreach_email: { subject: string; body: string };
  follow_up_email: { subject: string; body: string };
  call_script: {
    opener: string;
    talking_points: string[];
    if_hesitant: string;
    closing_ask: string;
  };
  linkedin_message: string;
  meeting_agenda: string[];
  proposal_outline: {
    overview: string;
    included: string[];
    timeline_note: string;
  };
};

type LeadRow = {
  business_name: string;
  category: string | null;
  neighbourhood: string | null;
  signal: string | null;
  outreach_note: string | null;
  concept_slug: string | null;
  research: LeadResearch | null;
};

// Who this kit is being written on behalf of — the piece that makes this
// function tenant-safe. isInternal is the same switch used everywhere
// else in this codebase an internal/tenant distinction matters
// (org-membership.ts, portal-org-branding.ts): HamishAI's own kits stay
// byte-for-byte identical to before this change; a real Agency Platform
// tenant gets a genuinely different, honest voice instead of Hamish's own
// name and hamishai.org URLs leaking into their outreach.
// agencyType is additive (Studio big-ticket, "agency-type templates
// correctness gap") — the real, previously-unused-after-signup context
// behind platform-plans.ts's marketed "agency type templates": which of
// the three real business models (agency-types.ts) a tenant picked at
// onboarding, so their own outreach voice actually reflects what kind of
// AI agency they run instead of identical generic boilerplate regardless
// of type. Optional and internal-org-irrelevant — HamishAI's own kits
// stay byte-for-byte unchanged either way.
export type SalesKitSender = { name: string; isInternal: boolean; agencyType?: AgencyType | null };

// A real sign-off reads as a genuine person reaching out, not an anonymous
// mailer — same instruction draft-lead-email.ts used to, kept identical
// for the internal org so nothing about HamishAI's own kits changes. A
// tenant has no phone/LinkedIn on file yet (nothing collects one), so
// their sign-off is honestly just their agency's name rather than
// inventing contact details that don't exist.
function signOffInstruction(sender: SalesKitSender): string {
  if (sender.isInternal) {
    return `Hamish
${siteConfig.phone}
${siteConfig.linkedin}`;
  }
  return sender.name;
}

function researchContext(research: LeadResearch | null): string {
  if (!research) return "";
  return `
Cached research on this business (already paid for — treat as ground truth, don't re-derive):
- Summary: ${research.business_summary}
- Strengths: ${research.strengths.join("; ") || "none noted"}
- Weaknesses: ${research.weaknesses.join("; ") || "none noted"}
- Missing trust signals: ${research.missing_trust_signals.join("; ") || "none noted"}
- Missing conversion opportunities: ${research.missing_conversion_opportunities.join("; ") || "none noted"}
- AI opportunities: ${research.ai_opportunities.join("; ") || "none noted"}
- Recommended service(s): ${research.recommended_services.join("; ") || "none noted"}
- Suggested sales angle: ${research.suggested_sales_angle}
- Why pursue: ${research.pursue_because}`;
}

function proofPointInstruction(lead: LeadRow, sender: SalesKitSender, matchedCaseStudy?: { name: string; industry: string; demoUrl: string }): string {
  // Both proof points below point at hamishai.org — real, concrete
  // evidence for HamishAI's own outreach, but not something a tenant has
  // any equivalent of yet (no portfolio, no per-tenant concept pages).
  // Gated on sender.isInternal explicitly rather than trusting
  // concept_slug/matchedCaseStudy to naturally stay empty for a tenant —
  // explicit is the same rule every other internal-vs-tenant switch in
  // this codebase already follows.
  if (!sender.isInternal) return "";
  if (lead.concept_slug) {
    return `\n\nOne concrete proof point, required in outreach_email and worth a brief natural mention in linkedin_message: Hamish has actually built ${lead.business_name} a real concept of what their own website could look like — not a generic example, a live page made specifically for them, including a working AI chat assistant trained on ${lead.business_name}'s own real details that visitors can talk to right now. In outreach_email you MUST include the literal URL https://www.hamishai.org/concepts/${lead.concept_slug} spelled out in full in the body itself, framed as "here's a concept I put together for your business" style. This is the single most important thing in the email — it's proof, not a pitch.`;
  }
  if (matchedCaseStudy) {
    return `\n\nOne concrete proof point, required in outreach_email: Hamish has built a similar real site for another ${matchedCaseStudy.industry} business, ${matchedCaseStudy.name}. You MUST include the literal URL https://www.hamishai.org${matchedCaseStudy.demoUrl} spelled out in full in the email body (not just the business name) so they can click through and see actual work in their own industry. Weave it in naturally, "here's an example" style.`;
  }
  return "";
}

function buildSystemPrompt(lead: LeadRow, sender: SalesKitSender, matchedCaseStudy?: { name: string; industry: string; demoUrl: string }): string {
  const signOff = signOffInstruction(sender);
  // agencyType, when known, replaces the generic tenant fallback with the
  // real business model this agency actually chose at signup — so the
  // pitch favours what they actually sell (e.g. an "AI Automation" agency
  // pitching a receptionist/booking build reads very differently from an
  // "AI Analytics" agency pitching a monthly reporting retainer) instead
  // of identical boilerplate regardless of type.
  const identity = sender.isInternal
    ? "as Hamish, who runs Hamish AI — a small Edinburgh-based AI/web consultancy that fixes concrete website/automation problems for small businesses"
    : sender.agencyType
      ? `on behalf of ${sender.name}, a ${sender.agencyType.name} agency — ${sender.agencyType.description} Their typical services: ${sender.agencyType.services.join(", ")}. Frame the pitch and any services mentioned around what this agency actually sells, not generic web/automation work.`
      : `on behalf of ${sender.name}, an AI/web consultancy that fixes concrete website/automation problems for small businesses`;

  return `You are ghostwriting a full outreach kit ${identity}. You will produce SIX distinct pieces for the same prospect in one pass, so keep them consistent with each other (same specific findings, same tone) but don't repeat yourself word-for-word between them — each has a different job.

Business: ${lead.business_name} (${lead.category || "unknown category"}, ${lead.neighbourhood || "unknown location"})
${lead.signal ? `Recorded signal: ${lead.signal}` : ""}
${lead.outreach_note ? `Recorded outreach note: ${lead.outreach_note}` : ""}
${researchContext(lead.research)}
${proofPointInstruction(lead, sender, matchedCaseStudy)}

General voice for everything below: plain English, warm, direct, zero jargon, zero hard sell. Always ground copy in the real, specific finding(s) above — never generic praise, never invent a fact about the business beyond what's given. Never use markdown formatting (no asterisks, headings, or bullet syntax) inside any text field — a link, if included, is just a plain URL in a sentence. Estimated figures (from research, if present) are for internal prioritisation only — never state a price or an estimate to the prospect in any of these six pieces.

1. outreach_email — a short cold email (4-6 sentences). Open with the specific, concrete observation, never a template greeting like "I hope this finds you well". Offer to help, invite a reply or a quick chat, no pressure. End with this exact sign-off on its own lines (plain text, no extra boilerplate):
${signOff}
Also write a short, specific, non-clickbait subject line that references the actual finding.

2. follow_up_email — a very short, low-pressure follow-up (2-3 sentences) for a few days after outreach_email if there's been no reply. Briefly remind them what the original note was about in passing, ask if they had a chance to see it, genuinely fine either way, not pushy. Do not repeat the full pitch. Same sign-off shape as above. Subject line makes clear it's a follow-up (e.g. "Following up on...").

3. call_script — a quick-reference cheat sheet for a cold call, not a word-for-word script: an opener (1-2 sentences, referencing the real finding), 2-3 short talking-point phrases (not full sentences), one line for if they sound unsure or busy, and the one thing to ask for before hanging up.

4. linkedin_message — a short LinkedIn connection/DM message (under 300 characters), same specific-finding grounding, no hashtags, no emoji, reads like one professional reaching out to another.

5. meeting_agenda — 3-5 short bullet points (each a few words to a short phrase) for a first intro call/meeting ONCE the business has already agreed to talk — distinct from call_script, which is for the cold outreach call itself. Cover things like: understanding their current setup, walking through the specific finding(s) and what's possible, a demo of the relevant example (concept page or case study, if one exists), next steps.

6. proposal_outline — an internal outline Hamish can turn into a real proposal document once someone's shown real interest: a one-sentence overview, 3-5 short "included" scope bullet points tailored to what this specific business actually needs (drawing on recommended services / AI opportunities above if present), and one short timeline_note giving a rough, honest phase description (e.g. "discovery call, then a build phase, then review and launch") — no firm dates or prices.`;
}

const SALES_KIT_TOOL: Anthropic.Tool = {
  name: "submit_sales_kit",
  description: "Submit all six outreach artifacts for this lead.",
  input_schema: {
    type: "object",
    properties: {
      outreach_email: {
        type: "object",
        properties: { subject: { type: "string" }, body: { type: "string" } },
        required: ["subject", "body"],
      },
      follow_up_email: {
        type: "object",
        properties: { subject: { type: "string" }, body: { type: "string" } },
        required: ["subject", "body"],
      },
      call_script: {
        type: "object",
        properties: {
          opener: { type: "string" },
          talking_points: { type: "array", items: { type: "string" } },
          if_hesitant: { type: "string" },
          closing_ask: { type: "string" },
        },
        required: ["opener", "talking_points", "if_hesitant", "closing_ask"],
      },
      linkedin_message: { type: "string" },
      meeting_agenda: { type: "array", items: { type: "string" } },
      proposal_outline: {
        type: "object",
        properties: {
          overview: { type: "string" },
          included: { type: "array", items: { type: "string" } },
          timeline_note: { type: "string" },
        },
        required: ["overview", "included", "timeline_note"],
      },
    },
    required: ["outreach_email", "follow_up_email", "call_script", "linkedin_message", "meeting_agenda", "proposal_outline"],
  },
};

// Real-improvement pass — brought up to the same defensive-coercion
// standard as stripBrief()/reconcilePhases() (website-brief.ts,
// website-build-phases.ts): accepts the raw `unknown` tool-call payload
// directly rather than trusting an unchecked `as SalesKit` cast at the
// call site, coerces every field, and never throws on a malformed shape
// — a missing/wrong-typed field becomes a real empty value that
// isWellFormed() below can catch, the same "coerce, don't trust
// structurally" instinct as sanitizeBlocksForWrite() in
// command-centre-layout.ts.
function toText(value: unknown): string {
  return typeof value === "string" ? stripMarkdownEmphasis(value) : "";
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string").map(stripMarkdownEmphasis);
  if (typeof value === "string" && value.trim()) return [stripMarkdownEmphasis(value)];
  return [];
}

export function stripKit(raw: unknown): SalesKit {
  const r = (raw ?? {}) as Record<string, unknown>;
  const outreach = (r.outreach_email ?? {}) as Record<string, unknown>;
  const followUp = (r.follow_up_email ?? {}) as Record<string, unknown>;
  const callScript = (r.call_script ?? {}) as Record<string, unknown>;
  const proposal = (r.proposal_outline ?? {}) as Record<string, unknown>;
  return {
    outreach_email: { subject: toText(outreach.subject), body: toText(outreach.body) },
    follow_up_email: { subject: toText(followUp.subject), body: toText(followUp.body) },
    call_script: {
      opener: toText(callScript.opener),
      talking_points: toStringArray(callScript.talking_points),
      if_hesitant: toText(callScript.if_hesitant),
      closing_ask: toText(callScript.closing_ask),
    },
    linkedin_message: toText(r.linkedin_message),
    meeting_agenda: toStringArray(r.meeting_agenda),
    proposal_outline: {
      overview: toText(proposal.overview),
      included: toStringArray(proposal.included),
      timeline_note: toText(proposal.timeline_note),
    },
  };
}

// Same role as website-brief.ts's isWellFormed() — a cheap real-content
// check the retry loop below uses to tell "the model returned a
// genuinely complete kit" from "stripKit() had to fall back on most of
// it." Thresholds match SALES_KIT_TOOL's own schema shape (every text
// field required, talking_points/meeting_agenda/included are the only
// arrays with no fixed minimum in the schema, so >=1 real item is the
// bar here).
export function isWellFormed(kit: SalesKit): boolean {
  return (
    kit.outreach_email.subject.length > 0 &&
    kit.outreach_email.body.length > 0 &&
    kit.follow_up_email.subject.length > 0 &&
    kit.follow_up_email.body.length > 0 &&
    kit.call_script.opener.length > 0 &&
    kit.call_script.talking_points.length > 0 &&
    kit.call_script.if_hesitant.length > 0 &&
    kit.call_script.closing_ask.length > 0 &&
    kit.linkedin_message.length > 0 &&
    kit.meeting_agenda.length > 0 &&
    kit.proposal_outline.overview.length > 0 &&
    kit.proposal_outline.included.length > 0 &&
    kit.proposal_outline.timeline_note.length > 0
  );
}

async function requestKit(
  anthropic: Anthropic,
  model: string,
  lead: LeadRow,
  sender: SalesKitSender,
  matched: { name: string; industry: string; demoUrl: string } | undefined
): Promise<SalesKit | null> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    system: buildSystemPrompt(lead, sender, matched),
    tools: [SALES_KIT_TOOL],
    tool_choice: { type: "tool", name: "submit_sales_kit" },
    messages: [{ role: "user", content: "Write the full sales kit." }],
  });

  const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
  return toolUse ? stripKit(toolUse.input) : null;
}

// sender defaults to HamishAI's own internal identity — every existing
// call site (just /admin/actions.ts today) keeps behaving exactly as
// before with no change required there. A future /studio caller passes
// the signed-in org's own name and isInternal: false explicitly.
export async function draftSalesKit(leadId: string, sender: SalesKitSender = { name: "Hamish AI", isInternal: true }) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: lead, error: leadError } = await supabase
    .from("prospects")
    .select("business_name, category, neighbourhood, signal, outreach_note, concept_slug, research")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) return { error: "Lead not found." as const };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const matched = sender.isInternal ? matchCaseStudy(lead.category) : undefined;

  try {
    // Three attempts, not one — same reasoning website-build-phases.ts's
    // own header documents: production latency and occasional malformed
    // tool-call output both turned out more common under real load than
    // a single-attempt happy path assumed. Only the last attempt's
    // result is accepted as a last resort if still imperfect, never a
    // silent placeholder.
    let kit: SalesKit | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await requestKit(anthropic, model, lead as LeadRow, sender, matched);
      if (result && isWellFormed(result)) {
        kit = result;
        break;
      }
      if (result && attempt === 2) kit = result; // last attempt: use what we have rather than nothing
    }
    if (!kit) return { error: "The AI did not return a sales kit." as const };

    const generatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("prospects")
      .update({ sales_kit: kit, sales_kit_generated_at: generatedAt })
      .eq("id", leadId);
    if (updateError) {
      console.error("Failed to save sales kit:", updateError);
      return { error: "Sales kit generated but failed to save." as const };
    }

    await logAuditEvent({
      actor: "admin",
      action: "lead.sales_kit_generated",
      targetType: "prospect",
      targetId: leadId,
      metadata: { subject: kit.outreach_email.subject },
    });

    return { kit, generatedAt };
  } catch (error) {
    console.error(`Failed to draft sales kit for lead ${leadId}:`, error);
    return { error: "The drafting agent is temporarily unavailable." as const };
  }
}
