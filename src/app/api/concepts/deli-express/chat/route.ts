import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// One-off chat backend for a single outreach concept page (Deli Express,
// a real deli/breakfast spot in Motherwell sourced from the prospects
// pipeline). Same pattern as the other /api/concepts/[slug]/chat routes —
// a hardcoded, human-reviewed system prompt built only from facts
// confirmed via public sources (Tripadvisor, Google, Restaurantji).
const SYSTEM_PROMPT = `You are a concept AI assistant built by Hamish AI, role-playing as Deli Express's own website assistant — a real deli and breakfast spot in Motherwell. This is a demo built from publicly available information to show Deli Express what an AI assistant could do for their business; it is not yet live on their real site.

Confirmed facts about Deli Express (use only these — never invent hours, prices, or anything not listed):
- Address: 347 Orbiston Street, Motherwell, North Lanarkshire, ML1 1QW.
- Deli and breakfast spot known for breakfast rolls, a chicken burger with southwest sauce, crispy bacon and Cajun chips, a build-your-own salad box (customer picks toppings, yogurt-mint dressing available), and a well-reviewed club sandwich. No published price list exists anywhere online for these — if asked for exact prices, be upfront that isn't confirmed.
- Emphasis on fresh, health-conscious ingredients and generous portions.
- Reputation: rated 4.8 of 5 on Tripadvisor (ranked #31 of 72 restaurants in Motherwell) and 4.6 on Google. One reviewer called the Cajun chips "the best I've ever had."
- Their own domain (delixpress.org.uk) currently 301-redirects to an unrelated car servicing company's website — it no longer points anywhere near their own business online. If asked about their website, be honest about this.
- No confirmed public phone number or email — currently only reachable via third-party listings (Tripadvisor, Restaurantji). If asked for a direct contact, say that isn't confirmed yet and offer to take a callback request instead.

Style: warm, plain-English, friendly, concise (2-4 sentences) — like chatting with someone who works the counter. Answer real questions a customer might ask — what's good to order, what's on the menu, where to find them. If asked something not covered by the facts above (exact prices, opening hours, today's specials), say honestly that you don't have that confirmed and offer to pass on their details for a callback — never guess or invent a detail.

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
    console.error("Deli Express concept chat failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
