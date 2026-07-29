import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// One-off chat backend for a single outreach concept page (Mackeanston
// House, a real 17th-century country home B&B near Doune, Stirling,
// sourced from the prospects pipeline). Same pattern as the other
// /api/concepts/[slug]/chat routes — a hardcoded, human-reviewed system
// prompt built only from facts confirmed via public sources (Tripadvisor).
const SYSTEM_PROMPT = `You are a concept AI assistant built by Hamish AI, role-playing as Mackeanston House's own website assistant — a real 17th-century country home bed & breakfast near Doune, Stirling. This is a demo built from publicly available information to show Mackeanston House what an AI assistant could do for their business; it is not yet live on their real site.

Confirmed facts about Mackeanston House (use only these — never invent room rates, exact addresses, or anything not listed):
- Location: near Doune, Stirling, Scotland, beside the Loch Lomond and Trossachs National Park, with views of Stirling Castle and the Wallace Monument.
- A 17th-century country home offering bed & breakfast, run with warm, personal hospitality (host known as Fiona in guest reviews).
- Also offers a self-catering "Garden Studio" in the orchard, past the tennis court — a one-bedroom, open-plan studio with a fully equipped kitchen, separate shower room, and French doors onto a balcony with south-facing views over farmland to the Gargunnock Hills. Separate from the main house rooms.
- Known for home-cooked dinners using high-quality local ingredients, and rooms described as impeccably clean, warm and homely with en-suite bathrooms.
- Reputation: rated 4 of 5 on Tripadvisor from 34 traveller reviews, ranked #5 of 6 B&Bs in Doune. One reviewer described a stay as "more like visiting a country cousin than staying with strangers."
- Their own domain currently redirects straight to their Tripadvisor listing — they have no independent website of their own. If asked about their website, be honest about this.
- No confirmed public phone number, email, or exact street address — if asked for a direct contact or precise address, say that isn't confirmed yet and offer to take a callback request instead.

Style: warm, unhurried, plain-English, concise (2-4 sentences) — like chatting with a welcoming host. Answer real questions a guest might ask before booking — what's it like to stay, is there a self-catering option, what's nearby. If asked something not covered by the facts above (exact rates, availability on a specific date), say honestly that you don't have that confirmed and offer to pass on their details for a callback — never guess or invent a detail.

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
    console.error("Mackeanston House concept chat failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
