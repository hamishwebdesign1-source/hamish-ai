import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { logAuditEvent } from "@/lib/audit-log";

// A quick-reference call script, not a script to read verbatim — a phone
// call needs short, scannable prompts (opener, a couple of talking
// points, one line for pushback, the ask), unlike the email draft which
// is the actual message being sent. Same underlying research (signal,
// outreach_note, concept_slug) as draft-lead-email.ts, different shape
// for a different medium.
const CALL_SCRIPT_TOOL: Anthropic.Tool = {
  name: "submit_call_script",
  description: "Submit the drafted call script.",
  input_schema: {
    type: "object",
    properties: {
      opener: { type: "string", description: "First 1-2 sentences to say when they pick up." },
      talking_points: {
        type: "array",
        items: { type: "string" },
        description: "2-3 short phrases (not full sentences) reminding Hamish what to mention.",
      },
      if_hesitant: { type: "string", description: "One short line to say if they sound unsure or busy." },
      closing_ask: { type: "string", description: "The one thing to ask for before hanging up." },
    },
    required: ["opener", "talking_points", "if_hesitant", "closing_ask"],
  },
};

function buildSystemPrompt(lead: {
  business_name: string;
  category: string | null;
  neighbourhood: string | null;
  signal: string | null;
  outreach_note: string | null;
  concept_slug?: string | null;
}) {
  const proofPointNote = lead.concept_slug
    ? `\n\nHamish has already built ${lead.business_name} a real, working concept of their own website (with a live AI chat assistant on it) at hamishai.org/concepts/${lead.concept_slug} — mention that he can send the link over by text or email straight after the call as the concrete next step.`
    : "";

  return `You are writing a brief phone-call cheat sheet for Hamish, who runs Hamish AI — a small Edinburgh-based AI/web consultancy — to glance at while cold-calling a business about a specific issue found with their website.

Business: ${lead.business_name} (${lead.category || "unknown category"}, ${lead.neighbourhood || "unknown location"})
Specific finding from checking their site: ${lead.signal || "not recorded"}
Suggested outreach angle: ${lead.outreach_note || "not recorded"}${proofPointNote}

This is a quick-reference cheat sheet, not a word-for-word script — short, scannable phrases Hamish can glance at mid-call, not full paragraphs to read aloud. Plain English, warm, no jargon, no hard sell. The opener must reference the real, specific finding above — never a generic "just checking in" line. Never invent a fact about the business beyond what's given above.`;
}

export async function draftLeadCallScript(leadId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: lead, error: leadError } = await supabase
    .from("prospects")
    .select("business_name, category, neighbourhood, signal, outreach_note, phone, concept_slug")
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
      max_tokens: 400,
      system: buildSystemPrompt(lead),
      tools: [CALL_SCRIPT_TOOL],
      tool_choice: { type: "tool", name: "submit_call_script" },
      messages: [{ role: "user", content: "Write the call script." }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUse) return { error: "The AI did not return a script." as const };

    const draft = toolUse.input as {
      opener: string;
      talking_points: string[];
      if_hesitant: string;
      closing_ask: string;
    };

    await logAuditEvent({
      actor: "admin",
      action: "lead.call_script_drafted",
      targetType: "prospect",
      targetId: leadId,
      metadata: { opener: stripMarkdownEmphasis(draft.opener) },
    });

    return {
      opener: stripMarkdownEmphasis(draft.opener),
      talkingPoints: draft.talking_points.map(stripMarkdownEmphasis),
      ifHesitant: stripMarkdownEmphasis(draft.if_hesitant),
      closingAsk: stripMarkdownEmphasis(draft.closing_ask),
      phone: lead.phone as string | null,
    };
  } catch (error) {
    console.error(`Failed to draft call script for lead ${leadId}:`, error);
    return { error: "The drafting agent is temporarily unavailable." as const };
  }
}
