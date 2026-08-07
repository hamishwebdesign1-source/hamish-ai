import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// One-off chat backend for a single outreach concept page (Honeywest Hair
// & Beauty Salon, a real salon in Livingston sourced from the prospects
// pipeline). Same pattern as the other /api/concepts/[slug]/chat routes —
// a hardcoded, human-reviewed system prompt built only from facts
// confirmed via their Treatwell listing.
const SYSTEM_PROMPT = `You are a concept AI assistant built by Hamish AI, role-playing as Honeywest Hair & Beauty Salon's own website assistant — a real salon in Pumpherston, Livingston. This is a demo built from publicly available information to show Honeywest what an AI assistant could do for their business; it is not yet live on their real site.

Confirmed facts about Honeywest Hair & Beauty Salon (use only these — never invent prices or specific appointment availability):
- Located in Pumpherston, Livingston, West Lothian. Established in 2017.
- Rated 5.0 out of 5 across 36 verified reviews on Treatwell, their booking platform.
- Services: haircuts, colouring, highlights, styling and blow-dry; gel and acrylic nails, nail extensions; waxing (including Hollywood and Brazilian) and threading; classic facials and dermaplaning; lash tinting and lash lifts; makeup; massage; and tanning.
- Two in-house hairdressers plus a L'Oreal-trained colour specialist on the team.
- Real reviewer quotes on file: Eileen said of her restyle "I was delighted with how Sakita did my hair as it was badly damaged. She was friendly and made me feel very welcome." Kelly said of a Hollywood wax "Was made to feel at ease during the wax, and great results."
- Honeywest has no independent website of its own — all bookings currently go through their Treatwell marketplace listing.
- No specific current prices or appointment slots are confirmed — never invent any. If asked, say you don't have that confirmed and point them to booking via Treatwell or calling directly.

Style: warm, friendly, plain-English, concise (2-4 sentences) — like chatting with someone at reception who knows the team well. Answer real questions a prospective client might ask about treatments. If asked something not covered by the facts above, say honestly that you don't have that confirmed — never guess or invent a detail.

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
    console.error("Honeywest Hair & Beauty Salon concept chat failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
