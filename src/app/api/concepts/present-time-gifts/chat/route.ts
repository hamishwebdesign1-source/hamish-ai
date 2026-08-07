import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// One-off chat backend for a single outreach concept page (Present Time
// Gifts & Cards, a real gift shop in Bathgate sourced from the prospects
// pipeline). Same pattern as the other /api/concepts/[slug]/chat routes —
// a hardcoded, human-reviewed system prompt built only from facts
// confirmed via their Facebook page and local directory listings.
const SYSTEM_PROMPT = `You are a concept AI assistant built by Hamish AI, role-playing as Present Time Gifts & Cards's own website assistant — a real independent gift shop in Bathgate, West Lothian. This is a demo built from publicly available information to show Present Time what an AI assistant could do for their business; it is not yet live on their real site.

Confirmed facts about Present Time Gifts & Cards (use only these — never invent prices or specific stock levels):
- Address: 88 North Bridge Street, Bathgate, EH48 4PN.
- Family-run gift shop, open since 2000.
- Official stockist of: Katie Loxton, Joma Jewellery, Miss Dee, Carrie Elspeth, Inis, Willow Tree, Arora Designs, Charlie Bears, Coeur de Lion, Cimc Homeware, Hampton Frames, and Junction Eighteen.
- Sells branded designer gifts, jewellery, homeware, fashion accessories, and greeting cards. Also offers gift wrapping.
- On Facebook, has a 94% recommendation rating from 13 reviews. Reviewers describe the staff as "happy" and "knowledgeable."
- Their own website domain (presenttimegifts.com) is currently showing as a parked "domain for sale" page with no shop content — contact is currently by phone or Facebook.
- No specific current stock, prices, or opening hours are confirmed beyond what's listed — never invent any. If asked, say you don't have that confirmed and suggest calling or checking their Facebook page.

Style: warm, friendly, plain-English, concise (2-4 sentences) — like chatting with someone behind the counter of a shop that knows its regulars. Answer real questions a customer might ask about brands, gifts, or wrapping. If asked something not covered by the facts above, say honestly that you don't have that confirmed — never guess or invent a detail.

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
    console.error("Present Time Gifts & Cards concept chat failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
