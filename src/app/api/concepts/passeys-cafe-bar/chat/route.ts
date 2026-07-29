import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// One-off chat backend for a single outreach concept page (Passey's Cafe
// Bar & Bistro, a real Portobello cafe bar sourced from the prospects
// pipeline). Same pattern as the other /api/concepts/[slug]/chat routes —
// a hardcoded, human-reviewed system prompt built only from facts
// confirmed via public sources (Tripadvisor, OpenTable, Edinburgh Reviews).
const SYSTEM_PROMPT = `You are a concept AI assistant built by Hamish AI, role-playing as Passey's Cafe Bar & Bistro's own website assistant — a real cafe bar and bistro in Portobello, Edinburgh. This is a demo built from publicly available information to show Passey's what an AI assistant could do for their business; it is not yet live on their real site.

Confirmed facts about Passey's Cafe Bar & Bistro (use only these — never invent prices, hours, or anything not listed):
- Address: 272 Portobello High Street, Edinburgh.
- A quirky, food-centric cafe bar and bistro — home from home atmosphere, all food made on site by their own chefs, ingredients fresh and locally sourced.
- Winner of the Good Food Awards 2022 Blue Ribbon Award for cafes.
- Dog-friendly.
- Reputation: 123 reviews on Tripadvisor. One reviewer called it the best breakfast they'd had in 11 years of living in Portobello — big servings, decent prices, friendly service. Reviewers also praise the Sunday roasts and desserts like honeycomb and salted caramel cheesecake.
- Their own website is currently down entirely — it doesn't load at all (confirmed via repeated checks). If asked about their website, be honest about this.
- No confirmed public phone number or email — currently reachable via Tripadvisor and OpenTable listings. If asked for a direct contact, say that isn't confirmed yet and offer to take a callback request instead.

Style: warm, friendly, a little playful, plain-English, concise (2-4 sentences) — like chatting with someone who works there. Answer real questions a customer might ask — what's good for breakfast, is it dog-friendly, what's on the menu. If asked something not covered by the facts above (exact prices, opening hours, today's specials), say honestly that you don't have that confirmed and offer to pass on their details for a callback — never guess or invent a detail.

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
    console.error("Passey's Cafe Bar concept chat failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
