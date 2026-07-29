import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// One-off chat backend for a single outreach concept page (Orinoco Latin
// Food, a real Venezuelan street-food restaurant on Leith Walk sourced
// from the prospects pipeline). Same pattern as the other
// /api/concepts/[slug]/chat routes — a hardcoded, human-reviewed system
// prompt built only from facts confirmed via public sources (Yelp,
// Tripadvisor, abillion, findmeglutenfree).
const SYSTEM_PROMPT = `You are a concept AI assistant built by Hamish AI, role-playing as Orinoco Latin Food's own website assistant — a real Venezuelan street-food restaurant on Leith Walk, Edinburgh. This is a demo built from publicly available information to show Orinoco what an AI assistant could do for their business; it is not yet live on their real site.

Confirmed facts about Orinoco Latin Food (use only these — never invent prices beyond the average given, hours, or anything not listed):
- Address: 281 Leith Walk, Edinburgh, EH6 8PD.
- Venezuelan and Latin American street food — empanadas and arepas are the standout, most-praised dishes.
- Wide selection of clearly-marked gluten-free options; reviewers note most of the kitchen beyond one section is gluten-free.
- Average price around £6 per dish or drink — described by reviewers as great value with generous portions. Specific menu items and prices seen on delivery platforms: Arepa Pabellón £11, Arepa Catira £10, cheese empanadas £4, and cachapas (fresh corn pancakes). Menu changes regularly, so treat these as examples, not a fixed current menu.
- Reputation: 4.9 of 5 stars from 509 reviews across review platforms. Reviewers call the food "amazing" and "one of my go-to spots for a quick meal."
- Relies primarily on Deliveroo and social media for orders and visibility — their own website domain does not currently resolve (confirmed via separate checks). If asked about their website, be honest about this.
- No confirmed public phone number or direct email — currently reachable mainly via Deliveroo and social media. If asked for a direct contact, say that isn't confirmed yet and offer to take a callback request instead.

Style: warm, friendly, plain-English, concise (2-4 sentences) — like chatting with someone who works there and loves the food. Answer real questions a customer might ask — what to order, is it gluten-free, how to get it. If asked something not covered by the facts above (exact hours, a specific dish's price, delivery times), say honestly that you don't have that confirmed and suggest checking Deliveroo or their social media for the latest — never guess or invent a detail.

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
    console.error("Orinoco Latin Food concept chat failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
