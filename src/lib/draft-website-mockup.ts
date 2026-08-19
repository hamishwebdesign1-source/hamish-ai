import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { logAuditEvent } from "@/lib/audit-log";
import type { LeadResearch } from "@/lib/research-lead";

// The "lightweight mockup" — customer-facing homepage copy for a
// prospect, not another internal analysis. Deliberately not the real
// concept-page generator (bespoke, hand-built, ~20+ tool calls per page,
// stays HamishAI-only — see the Agency Platform architecture doc's
// feature-separation table): this is one cached AI call producing text
// only, no custom design, no image sourcing, reusing the research
// already paid for as its primary input.
//
// Written to be genuinely tenant-safe from the start, unlike
// draft-sales-kit.ts (which hardcodes "Hamish" and hamishai.org URLs as
// HamishAI's own outreach voice) — orgName is a real parameter here, not
// a hardcoded brand, since this is called from /studio for any Agency
// Platform tenant's own prospects, not just HamishAI's.

export type WebsiteMockup = {
  hero_headline: string;
  hero_subheadline: string;
  problem_statement: string;
  services: { name: string; description: string }[];
  ai_pitch: string;
  cta_text: string;
};

type ProspectRow = {
  business_name: string;
  category: string | null;
  neighbourhood: string | null;
  research: LeadResearch | null;
};

function researchContext(research: LeadResearch | null): string {
  if (!research) {
    return "No research on file for this business yet — write from the business name, category and location only, and keep every claim generic rather than inventing specifics a real site might show.";
  }
  return `Research already done on this business (treat as ground truth, don't invent beyond it):
- Summary: ${research.business_summary}
- Services found: ${research.services.join("; ") || "none noted"}
- Weaknesses in their current online presence: ${research.weaknesses.join("; ") || "none noted"}
- AI opportunities identified: ${research.ai_opportunities.join("; ") || "none noted"}
- Recommended service(s): ${research.recommended_services.join("; ") || "none noted"}`;
}

function buildSystemPrompt(prospect: ProspectRow, orgName: string): string {
  return `You are writing homepage copy for a mockup website, on behalf of ${orgName}, a business that helps other businesses improve their online presence with AI. This mockup is shown to ONE specific prospect — ${prospect.business_name} (${prospect.category || "unknown category"}, ${prospect.neighbourhood || "unknown location"}) — as a concrete "here's what your new site could say" preview, not a generic template.

${researchContext(prospect.research)}

Write as if this is ${prospect.business_name}'s own homepage — first person plural ("we"), addressed to their customers, not a pitch addressed to the business itself. Plain English, no jargon, no invented facts (no made-up years trading, review counts, or awards). Keep every section short — this is a homepage preview, not a brochure.`;
}

const MOCKUP_TOOL: Anthropic.Tool = {
  name: "submit_website_mockup",
  description: "Submit the homepage mockup copy for this prospect.",
  input_schema: {
    type: "object",
    properties: {
      hero_headline: { type: "string", description: "The main homepage headline, in the business's own voice." },
      hero_subheadline: { type: "string", description: "One supporting sentence under the headline." },
      problem_statement: { type: "string", description: "One sentence naming the customer problem this business solves." },
      services: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" }, description: { type: "string" } },
          required: ["name", "description"],
        },
        description: "2-4 services, customer-facing names and one-sentence descriptions.",
      },
      ai_pitch: { type: "string", description: "One short paragraph on how this business now uses AI to serve customers better — specific to their real weaknesses/opportunities, not generic AI hype." },
      cta_text: { type: "string", description: "The button text for the homepage's main call to action, e.g. 'Book a free consultation'." },
    },
    required: ["hero_headline", "hero_subheadline", "problem_statement", "services", "ai_pitch", "cta_text"],
  },
};

function stripMockup(mockup: WebsiteMockup): WebsiteMockup {
  return {
    hero_headline: stripMarkdownEmphasis(mockup.hero_headline),
    hero_subheadline: stripMarkdownEmphasis(mockup.hero_subheadline),
    problem_statement: stripMarkdownEmphasis(mockup.problem_statement),
    services: mockup.services.map((s) => ({ name: stripMarkdownEmphasis(s.name), description: stripMarkdownEmphasis(s.description) })),
    ai_pitch: stripMarkdownEmphasis(mockup.ai_pitch),
    cta_text: stripMarkdownEmphasis(mockup.cta_text),
  };
}

export async function draftWebsiteMockup(prospectId: string, orgName: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("business_name, category, neighbourhood, research")
    .eq("id", prospectId)
    .single();
  if (prospectError || !prospect) return { error: "Prospect not found." as const };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      system: buildSystemPrompt(prospect as ProspectRow, orgName),
      tools: [MOCKUP_TOOL],
      tool_choice: { type: "tool", name: "submit_website_mockup" },
      messages: [{ role: "user", content: "Write the homepage mockup and submit it." }],
    });

    const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    if (!toolUse) return { error: "The AI did not return a mockup." as const };

    const mockup = stripMockup(toolUse.input as WebsiteMockup);
    const generatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("prospects")
      .update({ website_mockup: mockup, website_mockup_generated_at: generatedAt })
      .eq("id", prospectId);
    if (updateError) {
      console.error("Failed to save website mockup:", updateError);
      return { error: "Mockup generated but failed to save." as const };
    }

    await logAuditEvent({
      actor: "system",
      actorType: "system",
      action: "prospect.website_mockup_generated",
      targetType: "prospect",
      targetId: prospectId,
    });

    return { mockup, generatedAt };
  } catch (error) {
    console.error(`Failed to draft website mockup for prospect ${prospectId}:`, error);
    return { error: "The mockup generator is temporarily unavailable." as const };
  }
}
