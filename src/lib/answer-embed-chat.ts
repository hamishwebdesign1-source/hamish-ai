import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { logAuditEvent } from "@/lib/audit-log";

// The client-embeddable half of "sell a chatbot to your client's own
// website" — deliberately a much narrower tool than either of this app's
// other two copilots (answer-account-question.ts, answer-clients-question.ts).
// Both of those are authenticated, talking to one specific signed-in
// person about their own account. This one is public: anyone who visits
// a tenant's client's website can talk to it, with no login at all. That
// changes what it's allowed to know and say:
//
// - FAQ/support facts only (knowledge_base), never account data, never
//   invoices, requests, or anything that exists elsewhere in this app —
//   there is no session here to scope that data to, so it must never be
//   in the prompt to begin with, not just "instructed not to share it."
// - Explicitly told it has no access to real customer records, orders,
//   or accounts, and to say so plainly rather than improvise — the
//   scope decision (FAQ/support only, not sales) made when this was
//   scoped out.
export async function answerEmbedChat(clientId: string, messages: { role: "user" | "assistant"; content: string }[]) {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Not configured." as const };

  const { data: client } = await admin
    .from("clients")
    .select("id, business_name, org_id, chatbot_embed_enabled")
    .eq("id", clientId)
    .maybeSingle();
  if (!client || !client.chatbot_embed_enabled) return { error: "Chat is not available." as const };

  const { data: entries } = await admin
    .from("knowledge_base")
    .select("title, content")
    .or(`client_id.eq.${clientId},and(client_id.is.null,org_id.eq.${client.org_id})`);

  const knowledge = entries?.length
    ? entries.map((e) => `- ${e.title}: ${e.content}`).join("\n")
    : "(nothing published yet)";

  const systemPrompt = `You are a helpful assistant embedded on ${client.business_name}'s own website, answering visitor questions using only the facts below. You have no access to customer accounts, orders, bookings, or any personal/account data — if asked about any of that, say plainly you can't look that up and suggest they contact ${client.business_name} directly. Never invent a fact, price, or claim that isn't listed here.

What you know about ${client.business_name}:
${knowledge}

Plain English, warm and direct, no markdown formatting. Keep answers to 1-3 sentences unless asked for more detail.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "Chat is not configured." as const };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 300,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text");
    if (!textBlock) return { error: "No reply generated." as const };

    // Phase 4 usage visibility — reuses audit_log (already exists, no new
    // table) rather than inventing a parallel event-tracking mechanism.
    // Fire-and-forget: logAuditEvent() never throws, and a lost usage-
    // count entry should never be able to break a real visitor's chat.
    await logAuditEvent({
      actor: "embed-widget",
      actorType: "system",
      action: "embed_chat.message",
      targetType: "client",
      targetId: clientId,
      clientId,
    });

    return { reply: stripMarkdownEmphasis(textBlock.text) };
  } catch (error) {
    console.error("Embed chat failed:", error);
    return { error: "Chat is temporarily unavailable." as const };
  }
}
