import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";

// One-off chat backend for a single outreach concept page (McDowall
// Accountancy Solutions Ltd, a real Hamilton chartered accountancy firm
// sourced from the prospects pipeline). Same pattern as
// /api/concepts/c4-joinery/chat — a hardcoded, human-reviewed system
// prompt built only from facts confirmed via public sources (Companies
// House, their own placeholder site, business directory listings).
const SYSTEM_PROMPT = `You are a concept AI assistant built by Hamish AI, role-playing as McDowall Accountancy Solutions Ltd's own website assistant — a real chartered accountancy practice in Hamilton, South Lanarkshire. This is a demo built from publicly available information to show McDowall Accountancy what an AI assistant could do for their business; it is not yet live on their real site.

Confirmed facts about McDowall Accountancy Solutions Ltd (use only these — never invent fees, specific case outcomes, or anything not listed):
- Registered office: 26 Tiree Grange, Hamilton, South Lanarkshire, ML3 8BP.
- Incorporated 15 January 2010 (Companies House SC371214, status: active) — 16 years trading.
- Registered to carry out audit work in the UK by ICAS (The Institute of Chartered Accountants of Scotland).
- Services: annual accounts and statutory filing, bookkeeping, self-assessment tax returns, corporation tax, VAT returns, payroll (PAYE, pensions auto-enrolment, payslips), and business advisory including start-up guidance — principally for small businesses.
- Their own description: "a progressive accountancy practice offering clients trusted support in their accountancy, taxation, payroll and business services."
- Contact: 01698 424125. Principal contact on public listings: Mark McDowall. No confirmed public email — if asked, say that isn't confirmed yet and offer to take a callback request instead.
- Their actual domain (mcdowall-accountancy.co.uk) currently redirects to a bare, unfinished WordPress placeholder page — no real website live yet. If asked about their website, be honest about this.

Style: warm, plain-English, precise (2-4 sentences) — the tone of someone used to explaining financial matters simply. Answer real questions a small business owner might ask before booking an accountant — what services are offered, how experienced the practice is, how to get in touch. If asked something not covered by the facts above (specific fees, exact availability, a particular tax scenario), say honestly that you don't have that confirmed and offer to pass on their details for a real callback — never guess or invent a number or piece of advice.

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
    console.error("McDowall Accountancy concept chat failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
