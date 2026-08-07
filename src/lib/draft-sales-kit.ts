import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { siteConfig } from "@/lib/site-config";
import { matchCaseStudy } from "@/lib/match-case-study";
import { logAuditEvent } from "@/lib/audit-log";
import type { LeadResearch } from "@/lib/research-lead";

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

// A real sign-off reads as a genuine person reaching out, not an anonymous
// mailer — same instruction draft-lead-email.ts uses, kept identical so
// the two don't drift into different voices for the same business.
const SIGN_OFF_INSTRUCTION = `Hamish
${siteConfig.phone}
${siteConfig.linkedin}`;

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

function proofPointInstruction(lead: LeadRow, matchedCaseStudy?: { name: string; industry: string; demoUrl: string }): string {
  if (lead.concept_slug) {
    return `\n\nOne concrete proof point, required in outreach_email and worth a brief natural mention in linkedin_message: Hamish has actually built ${lead.business_name} a real concept of what their own website could look like — not a generic example, a live page made specifically for them, including a working AI chat assistant trained on ${lead.business_name}'s own real details that visitors can talk to right now. In outreach_email you MUST include the literal URL https://www.hamishai.org/concepts/${lead.concept_slug} spelled out in full in the body itself, framed as "here's a concept I put together for your business" style. This is the single most important thing in the email — it's proof, not a pitch.`;
  }
  if (matchedCaseStudy) {
    return `\n\nOne concrete proof point, required in outreach_email: Hamish has built a similar real site for another ${matchedCaseStudy.industry} business, ${matchedCaseStudy.name}. You MUST include the literal URL https://www.hamishai.org${matchedCaseStudy.demoUrl} spelled out in full in the email body (not just the business name) so they can click through and see actual work in their own industry. Weave it in naturally, "here's an example" style.`;
  }
  return "";
}

function buildSystemPrompt(lead: LeadRow, matchedCaseStudy?: { name: string; industry: string; demoUrl: string }): string {
  return `You are ghostwriting a full outreach kit as Hamish, who runs Hamish AI — a small Edinburgh-based AI/web consultancy that fixes concrete website/automation problems for small businesses. You will produce SIX distinct pieces for the same prospect in one pass, so keep them consistent with each other (same specific findings, same tone) but don't repeat yourself word-for-word between them — each has a different job.

Business: ${lead.business_name} (${lead.category || "unknown category"}, ${lead.neighbourhood || "unknown location"})
${lead.signal ? `Recorded signal: ${lead.signal}` : ""}
${lead.outreach_note ? `Recorded outreach note: ${lead.outreach_note}` : ""}
${researchContext(lead.research)}
${proofPointInstruction(lead, matchedCaseStudy)}

General voice for everything below: plain English, warm, direct, zero jargon, zero hard sell. Always ground copy in the real, specific finding(s) above — never generic praise, never invent a fact about the business beyond what's given. Never use markdown formatting (no asterisks, headings, or bullet syntax) inside any text field — a link, if included, is just a plain URL in a sentence. Estimated figures (from research, if present) are for Hamish's own prioritisation only — never state a price or an estimate to the prospect in any of these six pieces.

1. outreach_email — a short cold email (4-6 sentences). Open with the specific, concrete observation, never a template greeting like "I hope this finds you well". Offer to help, invite a reply or a quick chat, no pressure. End with this exact sign-off on its own lines (plain text, no extra boilerplate):
${SIGN_OFF_INSTRUCTION}
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

function stripKit(kit: SalesKit): SalesKit {
  return {
    outreach_email: { subject: stripMarkdownEmphasis(kit.outreach_email.subject), body: stripMarkdownEmphasis(kit.outreach_email.body) },
    follow_up_email: { subject: stripMarkdownEmphasis(kit.follow_up_email.subject), body: stripMarkdownEmphasis(kit.follow_up_email.body) },
    call_script: {
      opener: stripMarkdownEmphasis(kit.call_script.opener),
      talking_points: kit.call_script.talking_points.map(stripMarkdownEmphasis),
      if_hesitant: stripMarkdownEmphasis(kit.call_script.if_hesitant),
      closing_ask: stripMarkdownEmphasis(kit.call_script.closing_ask),
    },
    linkedin_message: stripMarkdownEmphasis(kit.linkedin_message),
    meeting_agenda: kit.meeting_agenda.map(stripMarkdownEmphasis),
    proposal_outline: {
      overview: stripMarkdownEmphasis(kit.proposal_outline.overview),
      included: kit.proposal_outline.included.map(stripMarkdownEmphasis),
      timeline_note: stripMarkdownEmphasis(kit.proposal_outline.timeline_note),
    },
  };
}

export async function draftSalesKit(leadId: string) {
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
  const matched = matchCaseStudy(lead.category);

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      system: buildSystemPrompt(lead as LeadRow, matched),
      tools: [SALES_KIT_TOOL],
      tool_choice: { type: "tool", name: "submit_sales_kit" },
      messages: [{ role: "user", content: "Write the full sales kit." }],
    });

    const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    if (!toolUse) return { error: "The AI did not return a sales kit." as const };

    const kit = stripKit(toolUse.input as SalesKit);
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
