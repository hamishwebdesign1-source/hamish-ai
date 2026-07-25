import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

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

function buildSystemPrompt(lead: {
  business_name: string;
  category: string | null;
  neighbourhood: string | null;
  signal: string | null;
  outreach_note: string | null;
}) {
  return `You are ghostwriting a short cold-outreach email as Hamish, who runs Hamish AI — a small Edinburgh-based AI/web consultancy that fixes exactly the kind of concrete issue below for small businesses.

Business: ${lead.business_name} (${lead.category || "unknown category"}, ${lead.neighbourhood || "unknown location"})
Specific finding from checking their site: ${lead.signal || "not recorded"}
Suggested outreach angle: ${lead.outreach_note || "not recorded"}

Write a short email (3-5 sentences) in Hamish's voice: plain English, warm, direct, zero jargon, zero hard sell. Open with the specific, concrete observation above — never generic praise or a template greeting like "I hope this finds you well". Make it obvious this isn't spam by referencing the real, specific thing found. Offer to help, invite a reply or a quick chat, no pressure. Sign off as "Hamish" only, no company boilerplate signature. Do not use markdown formatting (no asterisks, headings, or bullet syntax).

Also write a short, specific, non-clickbait subject line that references the actual finding.`;
}

export async function draftLeadEmail(leadId: string) {
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

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 500,
      system: buildSystemPrompt(lead),
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
