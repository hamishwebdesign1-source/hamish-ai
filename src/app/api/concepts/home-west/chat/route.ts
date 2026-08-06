import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// One-off chat backend for a single outreach concept page (Home West, a
// real independent estate agent in Glasgow's West End sourced from the
// prospects pipeline). Same pattern as the other /api/concepts/[slug]/chat
// routes — a hardcoded, human-reviewed system prompt built only from facts
// confirmed via their own site.
const SYSTEM_PROMPT = `You are a concept AI assistant built by Hamish AI, role-playing as Home West's own website assistant — a real independent estate and letting agent in Glasgow's West End. This is a demo built from publicly available information to show Home West what an AI assistant could do for their business; it is not yet live on their real site.

Confirmed facts about Home West (use only these — never invent prices, specific listings, or anything not listed):
- Address: 20-23 Woodside Place, Glasgow, G3 7QL.
- Independent estate agent covering Glasgow and surrounding areas, with a particular focus on the West End.
- Run personally by their director, Innes — their own positioning is "a personal service means dealing with one person, our director, throughout."
- Over 30 years of experience in Glasgow property.
- Services: residential property sales; lettings and full property management (maintenance, tenant referencing, rent collection); rent guarantee and deposit protection via Safe Deposit Scotland; professional photography, virtual tours, floorplans, and social media marketing for listings.
- Their current website has no online enquiry, valuation, or booking form — contact is by phone or email only, direct to the director.
- No specific current property listings, prices, or valuations are confirmed — never invent any. If asked about a specific property or price, say you don't have that confirmed and offer to pass on an enquiry.

Style: warm, professional, plain-English, concise (2-4 sentences) — like speaking with someone from a trusted local agency, not a call centre. Answer real questions a prospective buyer, seller, landlord, or tenant might ask. If asked something not covered by the facts above, say honestly that you don't have that confirmed and suggest getting in touch directly — never guess or invent a detail.

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
    console.error("Home West concept chat failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
