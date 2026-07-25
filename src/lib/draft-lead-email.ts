import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { caseStudies } from "@/lib/case-studies-data";

// Matches a lead's category to the closest live demo/case study, so the
// outreach email can point to one concrete, industry-matched proof point
// instead of describing capabilities in the abstract. Keyword-based and
// deliberately conservative — no match (salons, generic retailers, estate
// agents) is better than forcing an irrelevant one.
const CATEGORY_MATCHES: { keywords: string[]; slug: string }[] = [
  { keywords: ["restaurant", "cafe", "café", "bar", "bistro", "fish"], slug: "the-gannet" },
  { keywords: ["trade", "electric", "plumb", "joiner", "joinery"], slug: "craigie-and-sons" },
  { keywords: ["hotel", "b&b", "bnb", "guest house"], slug: "assembly-rooms-hotel" },
  { keywords: ["gym", "fitness", "training"], slug: "forge-fitness" },
  { keywords: ["account", "solicitor", "estate agent", "professional service"], slug: "lomond-and-grey" },
];

function matchCaseStudy(category: string | null) {
  if (!category) return undefined;
  const lower = category.toLowerCase();
  const match = CATEGORY_MATCHES.find((m) => m.keywords.some((k) => lower.includes(k)));
  if (!match) return undefined;
  return caseStudies.find((c) => c.slug === match.slug);
}

// Turns a researched lead's specific signal into a ready-to-send outreach
// email in Hamish's own voice — never a generic template, since the whole
// point of the lead tracker is a concrete, non-generic opening line per
// business rather than a form letter.
const DRAFT_EMAIL_TOOL: Anthropic.Tool = {
  name: "submit_draft_email",
  description: "Submit the drafted outreach email.",
  input_schema: {
    type: "object",
    properties: {
      subject: { type: "string" },
      body: { type: "string" },
    },
    required: ["subject", "body"],
  },
};

function buildSystemPrompt(
  lead: {
    business_name: string;
    category: string | null;
    neighbourhood: string | null;
    signal: string | null;
    outreach_note: string | null;
  },
  matchedCaseStudy?: { name: string; industry: string; demoUrl: string },
  isFollowUp = false
) {
  const proofPointInstruction = matchedCaseStudy
    ? `\n\nOne concrete proof point, required: Hamish has built a similar real site for another ${matchedCaseStudy.industry} business, ${matchedCaseStudy.name}. You MUST include the literal URL https://www.hamishai.org${matchedCaseStudy.demoUrl} spelled out in full in the email body itself (not just the business name on its own) so they can click through and see actual work in their own industry, not just a claim. Weave it in naturally, "here's an example" style, not a sales pitch — but the URL text itself must appear.`
    : "";

  if (isFollowUp) {
    return `You are ghostwriting a short, low-pressure follow-up email as Hamish, who runs Hamish AI — a small Edinburgh-based AI/web consultancy. He emailed this business a few days ago about a specific issue and hasn't heard back.

Business: ${lead.business_name} (${lead.category || "unknown category"}, ${lead.neighbourhood || "unknown location"})
What the original email was about: ${lead.signal || "not recorded"}

Write a very short follow-up (2-3 sentences) in Hamish's voice: plain English, warm, no pressure, no guilt-tripping about the non-reply. Briefly remind them what the original note was about (in passing, not repeating it in full) and ask if they had a chance to see it — genuinely fine either way, not pushy. Do not repeat the full pitch or re-explain everything from scratch. Sign off as "Hamish" only. Do not use markdown formatting.

Also write a short, specific subject line that makes clear this is a follow-up (e.g. "Following up on..." style), referencing the actual topic.`;
  }

  return `You are ghostwriting a short cold-outreach email as Hamish, who runs Hamish AI — a small Edinburgh-based AI/web consultancy that fixes exactly the kind of concrete issue below for small businesses.

Business: ${lead.business_name} (${lead.category || "unknown category"}, ${lead.neighbourhood || "unknown location"})
Specific finding from checking their site: ${lead.signal || "not recorded"}
Suggested outreach angle: ${lead.outreach_note || "not recorded"}

Write a short email (4-6 sentences) in Hamish's voice: plain English, warm, direct, zero jargon, zero hard sell. Open with the specific, concrete observation above — never generic praise or a template greeting like "I hope this finds you well". Make it obvious this isn't spam by referencing the real, specific thing found. Offer to help, invite a reply or a quick chat, no pressure. Sign off as "Hamish" only, no company boilerplate signature. Do not use markdown formatting (no asterisks, headings, or bullet syntax) — the link, if included, should just appear as a plain URL in a sentence.${proofPointInstruction}

Also write a short, specific, non-clickbait subject line that references the actual finding.`;
}

export async function draftLeadEmail(leadId: string, isFollowUp = false) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: lead, error: leadError } = await supabase
    .from("prospects")
    .select("business_name, category, neighbourhood, signal, outreach_note, email")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) return { error: "Lead not found." as const };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const matched = isFollowUp ? undefined : matchCaseStudy(lead.category);

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 500,
      system: buildSystemPrompt(lead, matched, isFollowUp),
      tools: [DRAFT_EMAIL_TOOL],
      tool_choice: { type: "tool", name: "submit_draft_email" },
      messages: [{ role: "user", content: "Draft the email." }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUse) return { error: "The AI did not return a draft." as const };

    const draft = toolUse.input as { subject: string; body: string };

    return {
      subject: stripMarkdownEmphasis(draft.subject),
      body: stripMarkdownEmphasis(draft.body),
      email: lead.email as string | null,
    };
  } catch (error) {
    console.error(`Failed to draft outreach email for lead ${leadId}:`, error);
    return { error: "The drafting agent is temporarily unavailable." as const };
  }
}
