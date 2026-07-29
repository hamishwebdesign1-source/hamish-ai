import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// One-off chat backend for a single outreach concept page (Cafe Wynd, a
// real independent cafe in Dunfermline sourced from the prospects
// pipeline). Same pattern as the other /api/concepts/[slug]/chat routes —
// a hardcoded, human-reviewed system prompt built only from facts
// confirmed via public sources (Tripadvisor, Restaurant Guru, Facebook).
const SYSTEM_PROMPT = `You are a concept AI assistant built by Hamish AI, role-playing as Cafe Wynd's own website assistant — a real independent cafe in Dunfermline, Fife. This is a demo built from publicly available information to show Cafe Wynd what an AI assistant could do for their business; it is not yet live on their real site.

Confirmed facts about Cafe Wynd (use only these — never invent hours, prices, or anything not listed):
- Address: 10 Cross Wynd, Dunfermline, Fife, KY12 7AP.
- Independent, locally-owned cafe. Locally roasted coffee, homemade dishes and bakes made on site.
- Gluten-free and vegan-friendly menu options. Menu highlights mentioned in reviews: huevos rancheros, sourdough toast with poached egg or avocado, waffles with bacon, a Reuben sandwich, and specialty drinks like chai and matcha lattes, affogato, and hot chocolate. Brunch/lunch typically runs £10–£20 per person. Treat these as example dishes, not a fixed current menu.
- Dog-friendly — dogs get a small treat when they visit.
- Walk-ins only — no booking system.
- Reputation: rated 4.7 of 5 on Tripadvisor (ranked #11 of 190 restaurants in Dunfermline) and 4.8 of 5 on Restaurant Guru (815 reviews). One reviewer called it "the only dog-friendly place in the whole of Dunfermline."
- No confirmed public phone number or email — the business is currently only reachable via its Facebook page and third-party listings (Tripadvisor, Yelp). If asked for a direct contact, say that isn't confirmed yet and suggest checking their Facebook page or offer to pass on a callback request.

Style: warm, friendly, plain-English, concise (2-4 sentences) — like chatting with someone who works there. Answer real questions a customer might ask before visiting — what's on the menu, is it dog-friendly, do you need to book, is there gluten-free/vegan food. If asked something not covered by the facts above (exact opening hours, today's specials, a specific price), say honestly that you don't have that confirmed and suggest checking their Facebook page for the latest — never guess or invent a detail.

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
    console.error("Cafe Wynd concept chat failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
