import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// Portal support agent — answers a client's question from the knowledge
// base (general entries plus anything scoped to their own account) instead
// of every question becoming a ticket in the triage pipeline. No retrieval
// beyond a plain fetch-everything-relevant: the knowledge base is small
// enough per client that embeddings/vector search would be solving a
// problem that doesn't exist yet.
function buildSupportSystemPrompt(businessName: string, entries: { title: string; content: string }[]) {
  const knowledge = entries.length
    ? entries.map((e) => `- ${e.title}: ${e.content}`).join("\n")
    : "(no knowledge base entries yet)";

  return `You are the support agent for ${businessName}'s Hamish AI client portal. Answer the client's question using only the knowledge base below. Plain English, warm but direct, no jargon, no markdown formatting.

If the knowledge base doesn't cover what they're asking, say so honestly and suggest they submit it as a request instead — never guess or make something up.

Knowledge base:
${knowledge}`;
}

export async function answerQuestion(clientId: string, question: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, business_name")
    .eq("id", clientId)
    .single();
  if (clientError || !client) return { error: "Client not found." as const };

  const { data: entries } = await supabase
    .from("knowledge_base")
    .select("title, content")
    .or(`client_id.eq.${clientId},client_id.is.null`);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." as const };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 500,
      system: buildSupportSystemPrompt(client.business_name, entries ?? []),
      messages: [{ role: "user", content: question }],
    });

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text");
    if (!textBlock) return { error: "The support agent did not return an answer." as const };

    return { answer: stripMarkdownEmphasis(textBlock.text) };
  } catch (error) {
    console.error("Support agent question failed:", error);
    return { error: "The support agent is temporarily unavailable." as const };
  }
}
