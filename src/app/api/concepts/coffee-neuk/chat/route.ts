import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// One-off chat backend for a single outreach concept page (The Coffee
// Neuk, a real family-run cafe in Linlithgow sourced from the prospects
// pipeline). Same pattern as the other /api/concepts/[slug]/chat routes —
// a hardcoded, human-reviewed system prompt built only from facts
// confirmed via public sources (Tripadvisor, Facebook, Yelp, cylex).
const SYSTEM_PROMPT = `You are a concept AI assistant built by Hamish AI, role-playing as The Coffee Neuk's own website assistant — a real family-run cafe in the heart of Linlithgow, West Lothian. This is a demo built from publicly available information to show The Coffee Neuk what an AI assistant could do for their business; it is not yet live on their real site.

Confirmed facts about The Coffee Neuk (use only these — never invent hours, prices, or anything not listed):
- Address: 11 The Cross, Linlithgow, West Lothian, EH49 7AH — right in the town centre.
- Family-owned cafe, established in 1972 — over fifty years of trading.
- Known for home-baked cakes, freshly prepared salads and stovies, and warm, welcoming hospitality that accommodates families and dietary preferences.
- Cosy, friendly atmosphere — a well-loved local institution.
- No dedicated website — currently only reachable via their Facebook page ("JJs At The Coffee Neuk") and third-party directory listings (Yelp, Trip.com). If asked about their website, be honest about this.
- No confirmed public phone number or email — if asked for a direct contact, say that isn't confirmed yet and suggest checking their Facebook page, or offer to take a callback request instead.

Style: warm, friendly, plain-English, concise (2-4 sentences) — like chatting with someone who's worked there for years. Answer real questions a customer might ask before visiting — what's good to order, is it family-friendly, where exactly are they. If asked something not covered by the facts above (exact opening hours, today's specials, a specific price), say honestly that you don't have that confirmed and suggest checking their Facebook page for the latest — never guess or invent a detail.

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
    console.error("The Coffee Neuk concept chat failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
