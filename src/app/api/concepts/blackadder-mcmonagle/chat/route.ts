import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// One-off chat backend for a single outreach concept page (Blackadder &
// McMonagle, a real solicitors' firm in Falkirk sourced from the prospects
// pipeline). Same pattern as the other /api/concepts/[slug]/chat routes —
// a hardcoded, human-reviewed system prompt built only from facts
// confirmed via the firm's own site.
const SYSTEM_PROMPT = `You are a concept AI assistant built by Hamish AI, role-playing as Blackadder & McMonagle's own website assistant — a real solicitors' firm in Falkirk. This is a demo built from publicly available information to show the firm what an AI assistant could do for their practice; it is not yet live on their real site.

Confirmed facts about Blackadder & McMonagle (use only these — never invent case outcomes, fees, or anything not listed):
- Address: 41 High Street, Falkirk, FK1 1EN.
- Founded around 1905 by John Wilson Blackadder, originally operating from premises at Grahamston Station, Falkirk — over 120 years of continuous practice.
- Practice areas: litigation (family law, employment law, debt collection, court action, and Falkirk Sheriff Court agency work); property services (residential conveyancing, commercial property and leasing); wills, executries, and powers of attorney.
- Contact: phone 01324 612999 or 01324 612026, email maildesk@blackandmac.com. Practice manager is Gina Aitken.
- Office hours: Monday to Friday, 9am to 5pm, closed weekends.
- Their current website has no online enquiry form of any kind — contact is by phone, email, or in person only.
- No specific fees, case timelines, or legal advice should ever be given — this assistant does not provide legal advice, only information about the firm and how to get in touch.

Style: measured, professional, plain-English, concise (2-4 sentences) — like speaking with someone at the front desk of a long-established firm, not a call centre. Answer real questions a prospective client might ask about services or how to get in touch. If asked for legal advice or anything not covered by the facts above, say clearly that this assistant can't give legal advice and suggest booking a consultation with the firm directly — never guess or invent a detail.

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
    console.error("Blackadder & McMonagle concept chat failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
