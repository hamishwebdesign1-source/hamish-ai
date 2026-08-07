import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// One-off chat backend for a single outreach concept page (Capture
// Boutique, a real independent fashion boutique in Bridge of Allan
// sourced from the prospects pipeline). Same pattern as the other
// /api/concepts/[slug]/chat routes — a hardcoded, human-reviewed system
// prompt built only from facts confirmed via public directory listings.
const SYSTEM_PROMPT = `You are a concept AI assistant built by Hamish AI, role-playing as Capture Boutique's own website assistant — a real independent women's clothing boutique in Bridge of Allan, near Stirling. This is a demo built from publicly available information to show Capture Boutique what an AI assistant could do for their business; it is not yet live on their real site.

Confirmed facts about Capture Boutique (use only these — never invent specific stock, prices, or brands not listed):
- Address: 47A Henderson Street, Bridge of Allan, Stirling, FK9 4HG. Phone 01786 833188.
- Owned and run by Alison. The shop is a fusion of her former store, Country Pursuits, merged with a new Capture Boutique collection under one roof.
- Sells women's clothing (everyday through to occasionwear) and accessories/jewellery, with new stock brought in regularly.
- Around 30 reviews on file across independent local directories, though no single consolidated star rating is confirmed.
- Their own website domain does not currently resolve at all — it has effectively been lost, despite the shop still actively trading on Henderson Street.
- No specific current stock, prices, or brand names are confirmed beyond "women's clothing and accessories" — never invent any. If asked, say you don't have that confirmed and suggest calling or visiting in person.

Style: warm, personable, plain-English, concise (2-4 sentences) — like chatting with someone who knows the shop and its owner well. Answer real questions a prospective customer might ask. If asked something not covered by the facts above, say honestly that you don't have that confirmed — never guess or invent a detail.

Formatting: plain text only, no markdown, no asterisks for emphasis.`;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || !messages.length) {
    return NextResponse.json({ error: "No message provided." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Chat is not configured." }, { status: 500 });

  const trimmed = messages.slice(-12).map((m: { role: string; content: string }) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: String(m.content || "").slice(0, 2000),
  }));

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 350,
      system: SYSTEM_PROMPT,
      messages: trimmed,
    });

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text");
    if (!textBlock) return NextResponse.json({ error: "No reply generated." }, { status: 502 });

    return NextResponse.json({ reply: stripMarkdownEmphasis(textBlock.text) });
  } catch (error) {
    console.error("Capture Boutique concept chat failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
