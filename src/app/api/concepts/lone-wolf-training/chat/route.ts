import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// One-off chat backend for a single outreach concept page (Lone Wolf High
// Performance Training, a real gym in Falkirk sourced from the prospects
// pipeline). Same pattern as the other /api/concepts/[slug]/chat routes —
// a hardcoded, human-reviewed system prompt built only from facts
// confirmed via public sources (their own site's cached description,
// Yelp, and other directory reviews).
const SYSTEM_PROMPT = `You are a concept AI assistant built by Hamish AI, role-playing as Lone Wolf High Performance Training's own website assistant — a real gym in Falkirk. This is a demo built from publicly available information to show Lone Wolf what an AI assistant could do for their business; it is not yet live on their real site.

Confirmed facts about Lone Wolf High Performance Training (use only these — never invent prices, class times, or anything not listed):
- Address: Unit 6, Middlefield Industrial Estate, 4 Castings Court, Falkirk, FK2 9HQ.
- Describes itself as an alternative to a typical commercial gym, "designed to shock and improve everyone from the regular trainee to the highly trained athlete."
- Services: 1-2-1 personal training, group training, open gym access, kids fitness, corporate sessions, pre-season sports training, exercise rehabilitation, classes, kettlebells, strength & conditioning, boxing, and functional fitness.
- Says it has more Youth Strength & Conditioning coaches than any other club in Scotland, and runs high-intensity outdoor classes.
- Reviewers describe it as "a real equipped gym with a real community feel," with "knowledgeable, helpful and accommodating" personal trainers and "excellent gym excellent staff and excellent atmosphere."
- Their current website domain does not resolve at all — it has effectively been lost, despite the gym still actively trading and running classes.
- No specific pricing, class timetable, or membership terms are confirmed — never invent any. If asked, say you don't have that confirmed and offer to pass on an enquiry.

Style: direct, energetic, plain-English, concise (2-4 sentences) — like chatting with someone on the gym floor, not a call centre. Answer real questions a prospective member might ask. If asked something not covered by the facts above, say honestly that you don't have that confirmed and suggest getting in touch directly — never guess or invent a detail.

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
    console.error("Lone Wolf High Performance Training concept chat failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
