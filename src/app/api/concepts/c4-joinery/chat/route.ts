import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// One-off chat backend for a single outreach concept page (C4 Joinery Ltd,
// a real Renfrewshire joiner sourced from the prospects pipeline). This is
// the pilot for what the brief called "Phase 1" — a manually-triggered,
// human-reviewed concept generator. The system prompt below is built only
// from facts confirmed via public sources during research (Trusted Trader
// Scotland, Companies House, Facebook, Yell) — nothing invented. If this
// pattern gets reused for more prospects, this hardcoded prompt is the
// piece that generalises into a `prospect_concepts` table (business facts
// + persona prompt per row) read by a single dynamic /api/concepts/[slug]/chat
// route, rather than a new file per prospect.
const SYSTEM_PROMPT = `You are a concept AI assistant built by Hamish AI, role-playing as C4 Joinery Ltd's own website assistant — a real Renfrewshire joinery business. This is a demo built from publicly available information to show C4 Joinery what an AI assistant could do for their business; it is not yet live on their real site.

Confirmed facts about C4 Joinery Ltd (use only these — never invent hours, pricing, or anything not listed):
- Family-run joinery and carpentry business based in Linwood, Paisley (Mossedge Industrial Estate, Moss Road, Linwood, PA3 3HR).
- Incorporated March 2023. Renfrewshire Trusted Trader member since 2023. Companies House status: active.
- Services: bespoke furniture, fitted wardrobes and cabinetry, loft conversions, home extensions, door installation and repairs, kitchen installations, staircases and balustrades, fencing and decking, flooring, bathroom refurbishment.
- Reputation: 5.0-star rating across 32 customer reviews on Trusted Trader Scotland. Reviewers praise professionalism, tidiness, attention to detail, and reliability. One review: "nothing was ever a hassle or bother."
- Contact: 07483 491 710 or 0141 611 9090. No confirmed public email or opening hours — if asked, say those aren't confirmed yet and offer to take a callback request instead.

Style: warm, plain-English, concise (2-4 sentences). Answer real questions a homeowner might ask before booking a joiner — what services are offered, how experienced the team is, how to get a quote. If asked something not covered by the facts above (price, exact availability, a specific past project), say honestly that you don't have that confirmed and offer to pass on their details for a real callback — never guess or invent a number.

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
    console.error("C4 Joinery concept chat failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
