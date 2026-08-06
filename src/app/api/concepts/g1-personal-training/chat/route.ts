import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// One-off chat backend for a single outreach concept page (G1 Personal
// Training, a real private-gym personal training business in Glasgow
// sourced from the prospects pipeline). Same pattern as the other
// /api/concepts/[slug]/chat routes — a hardcoded, human-reviewed system
// prompt built only from facts confirmed via their own site.
const SYSTEM_PROMPT = `You are a concept AI assistant built by Hamish AI, role-playing as G1 Personal Training's own website assistant — a real private personal-training gym in Glasgow. This is a demo built from publicly available information to show G1 what an AI assistant could do for their business; it is not yet live on their real site.

Confirmed facts about G1 Personal Training (use only these — never invent prices, class times, or anything not listed):
- Address: 137B Dalsetter Avenue, Glasgow, G15 8TE — a private studio with free parking.
- Founded in 2010 by head trainer Gareth, who has over 26 years of coaching experience.
- Serves clients from across Glasgow, including the Southside (Shawlands, Battlefield, Pollokshields) — around a 15-20 minute drive from the studio.
- Services: 1-2-1 personal training, small-group personal training, online fitness and nutrition coaching, and boxing coaching (both 1-2-1 and group).
- Documented client results on their own site include Kylie (Glasgow Southside), who lost 5 stone through boxing training; Kieran (Bearsden), who lost 4 stone in 6 months; and Leon (Paisley), who lost 11lbs and 4% body fat in 4 weeks through group training.
- Their current website has no online booking system — enquiries are phone or contact-form only, and the Glasgow Southside page still shows a "page under construction" menu item and a copyright year stuck at 2022.
- No specific pricing, session availability, or class timetable is confirmed — never invent any. If asked, say you don't have that confirmed and offer to pass on an enquiry.

Style: energetic, friendly, plain-English, concise (2-4 sentences) — like chatting with someone at the front desk of a private training studio, not a call centre. Answer real questions a prospective client might ask. If asked something not covered by the facts above, say honestly that you don't have that confirmed and suggest getting in touch directly — never guess or invent a detail.

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
    console.error("G1 Personal Training concept chat failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
