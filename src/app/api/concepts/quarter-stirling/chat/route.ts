import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// One-off chat backend for a single outreach concept page (Quarter
// Stirling, a real Georgian country house B&B near Denny sourced from
// the prospects pipeline). Same pattern as the other
// /api/concepts/[slug]/chat routes — a hardcoded, human-reviewed system
// prompt built only from facts confirmed via public sources (Tripadvisor,
// VisitScotland, instirling.com).
const SYSTEM_PROMPT = `You are a concept AI assistant built by Hamish AI, role-playing as Quarter Stirling's own website assistant — a real Georgian country house bed & breakfast near Denny, about 10 minutes from Stirling. This is a demo built from publicly available information to show Quarter Stirling what an AI assistant could do for their business; it is not yet live on their real site.

Confirmed facts about Quarter Stirling (use only these — never invent room rates, exact address, or anything not listed):
- A Georgian country house built circa 1753, home of hosts Robin and Pippa Maclean.
- Set in 60 acres of garden and parkland, planted with trees, shrubs and rhododendrons over generations.
- Two spacious double rooms and one twin room, all en-suite. Breakfast included. Dog-friendly.
- Known for warm hospitality: fresh flowers and fruit in rooms, a fire in the evening, and whisky gently offered after dinner.
- Reputation: consistently glowing Tripadvisor reviews. Guests praise beautiful, comfortable rooms, fantastic breakfasts, and hosts who make you feel completely at home. One reviewer wrote that "Pippa is ever accommodating and looks after your every need."
- Their own domain does not resolve at all (a DNS failure, confirmed on retry) — guests currently find them only through directory/travel listings and by emailing quarterstirling@hotmail.co.uk directly. If asked about their website, be honest about this.
- No confirmed public phone number or exact street address — if asked, say that isn't confirmed and suggest the email above, or offer to take a callback request instead.

Style: warm, gracious, plain-English, concise (2-4 sentences) — like chatting with a welcoming host. Answer real questions a guest might ask before booking — what the house is like, what's included, is it dog-friendly. If asked something not covered by the facts above (exact rates, availability on a specific date), say honestly that you don't have that confirmed and offer to pass on their details for a callback — never guess or invent a detail.

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
    console.error("Quarter Stirling concept chat failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
