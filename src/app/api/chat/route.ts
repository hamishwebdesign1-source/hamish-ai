import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chat-system-prompt";
import { getFallbackReply } from "@/lib/chat-fallback";
import { saveLead } from "@/lib/save-lead";
import { isRateLimited, getClientKey } from "@/lib/chat-rate-limit";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { getCaseStudy } from "@/lib/case-studies-data";
import {
  healthScore,
  momentumMetrics,
  aiInsights,
  executiveBriefing,
  forecast,
  funnelSteps,
  dashboardKpis,
} from "@/lib/analytics-data";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 20;

type IncomingMessage = { role: unknown; content: unknown };

function sanitizeMessages(messages: IncomingMessage[]) {
  return messages
    .filter(
      (m): m is { role: "user" | "assistant"; content: string } =>
        (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string"
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ ...m, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));
}

// Project context is looked up server-side from a slug, never trusted
// as free-form client input — accepting arbitrary project details would
// let a caller inject anything directly into the system prompt.
function buildSystemPrompt(projectSlug: unknown) {
  const project = typeof projectSlug === "string" ? getCaseStudy(projectSlug) : undefined;
  if (!project) return CHAT_SYSTEM_PROMPT;

  const featuresList = project.aiFeatures
    .map((f) => `- ${f.title}: ${f.description}`)
    .join("\n");

  return `${CHAT_SYSTEM_PROMPT}

The visitor is currently looking at the "${project.name}" case study (${project.industry}) in the portfolio. Project overview: ${project.overview}

AI features implemented in this specific project:
${featuresList}

If they ask about "this project," "this case study," or similar, answer using the details above rather than generic examples.`;
}

// A completely different mode from buildSystemPrompt above: instead of the
// Hamish AI sales assistant *talking about* a case study, this makes the
// assistant *role-play as* that fictional business's own AI, so a visitor
// can try the actual product rather than read a description of it. Looked
// up server-side from a slug for the same injection-safety reason.
function buildDemoSystemPrompt(demoSlug: unknown) {
  const project = typeof demoSlug === "string" ? getCaseStudy(demoSlug) : undefined;
  if (!project) return null;

  return `${project.persona.systemPrompt}

Formatting: replies render as plain text in a chat bubble, not markdown. Never use asterisks for bold or italic emphasis (**text** or *text*), #headings, or markdown bullet syntax — write plain sentences, and use a simple dash and line break for lists.

Honesty rule: this is a Hamish AI portfolio demo, not a real business — no one will actually call, email, or follow up. Stay in character for the conversation itself, but if a visitor offers a real name, phone number, or email expecting a genuine callback, gently clarify that this is a demo built by Hamish AI to show what an assistant like this could do, so there's no real follow-up here — then invite them to hamishai.org/book if they'd like this built for their own business.`;
}

// The AI Copilot tab on the /analytics Command Centre demo: role-plays as a
// business's own AI analytics assistant, answering questions about the same
// illustrative dataset rendered on screen (health score, momentum metrics,
// insights, forecast, funnel) so answers stay consistent with what the
// visitor is looking at. No demoSlug involved — this isn't tied to any one
// case-study business, just the generic Command Centre demo data.
function buildAnalyticsCopilotSystemPrompt(isCopilot: unknown) {
  if (isCopilot !== true) return null;

  const momentumList = momentumMetrics
    .map((m) => `- ${m.label}: ${m.score}/100 (${m.trendValue})`)
    .join("\n");
  const insightsList = aiInsights.map((i) => `- ${i.text} (${i.confidence}% confidence)`).join("\n");
  const funnelList = funnelSteps.map((f) => `${f.label}: ${f.value}`).join(" → ");
  const kpiList = dashboardKpis.map((k) => `- ${k.label}: ${k.value} (${k.trendValue})`).join("\n");

  return `You are the AI Copilot inside a fictional business's "AI Command Centre" — a demo built by Hamish AI to show what an AI business-intelligence assistant could feel like. Answer questions the way a genuinely useful business analytics copilot would: direct, plain-English, specific.

Here is the illustrative business data you have access to (this is what's shown on screen — always answer consistently with it):

AI Health Score: ${healthScore.score}/100 — "${healthScore.verdict}"

Momentum metrics:
${momentumList}

Key metrics:
${kpiList}

Current AI insights:
${insightsList}

Revenue forecast: ${forecast.projected} projected over the ${forecast.horizon.toLowerCase()} (${forecast.confidenceRange})

Conversion funnel: ${funnelList}

Illustrative staff performance (only mention if directly asked "which staff member is performing best" or similar): Priya has the highest customer satisfaction score this month; Tom has closed the most bookings; both are ahead of the team average.

Executive briefing: "${executiveBriefing}"

When asked things like "why have bookings dropped," "which staff member is performing best," "what products should I promote," or "what trends should I prepare for," answer using the data above, reasoning about it the way an analyst would (e.g. connect the Monday cancellations mentioned in the briefing to a possible cause) rather than inventing unrelated specifics.

Formatting: replies render as plain text in a chat bubble, not markdown. Never use asterisks for bold or italic emphasis (**text** or *text*), #headings, or markdown bullet syntax — write plain sentences, and use a simple dash and line break for lists.

Honesty rule: this is a Hamish AI portfolio demo with fictional data, not a real business — no one will actually call, email, or follow up, and there's no real business behind these numbers. Stay in character answering questions about the data itself, but if a visitor offers real contact details expecting a genuine callback, or asks you to actually do something in the real world, gently clarify this is a demo and invite them to hamishai.org/book if they'd like a system like this built for their own business.`;
}

const SAVE_LEAD_TOOL: Anthropic.Tool = {
  name: "save_lead",
  description:
    "Save the visitor's contact details as a lead for follow-up. Only call this once you have at least their name and email.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      business_name: { type: "string" },
      business_type: { type: "string" },
      email: { type: "string" },
      help_with: { type: "string" },
    },
    required: ["name", "email"],
  },
};

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json(
      { error: "Too many messages — please try again in a few minutes." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const rawMessages: unknown = body?.messages;

  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json({ error: "messages is required." }, { status: 400 });
  }

  const trimmed = sanitizeMessages(rawMessages);

  if (trimmed.length === 0) {
    return NextResponse.json({ error: "messages is required." }, { status: 400 });
  }

  const lastUserMessage = [...trimmed].reverse().find((m) => m.role === "user");

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ reply: getFallbackReply(lastUserMessage?.content ?? "") });
  }

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  // Interactive case-study demo mode: the assistant role-plays as a
  // fictional portfolio business, not Hamish AI. No lead-capture tool here
  // — a fictional business "saving a lead" would write fake data into the
  // real leads table alongside genuine enquiries, which is a correctness
  // bug, not just an unnecessary feature.
  const demoSystemPrompt = buildDemoSystemPrompt(body?.demoSlug);
  if (demoSystemPrompt) {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 400,
        system: demoSystemPrompt,
        messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
      });
      const text = stripMarkdownEmphasis(
        response.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("\n")
      );
      return NextResponse.json({ reply: text });
    } catch (error) {
      console.error("Anthropic demo chat request failed:", error);
      return NextResponse.json(
        { error: "The demo assistant is temporarily unavailable — please try again shortly." },
        { status: 502 }
      );
    }
  }

  // AI Command Centre copilot mode — same shape as the demoSystemPrompt
  // branch above (no lead-capture tool, illustrative fictional data only).
  const copilotSystemPrompt = buildAnalyticsCopilotSystemPrompt(body?.analyticsCopilot);
  if (copilotSystemPrompt) {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 400,
        system: copilotSystemPrompt,
        messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
      });
      const text = stripMarkdownEmphasis(
        response.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("\n")
      );
      return NextResponse.json({ reply: text });
    } catch (error) {
      console.error("Anthropic copilot chat request failed:", error);
      return NextResponse.json(
        { error: "The AI Copilot is temporarily unavailable — please try again shortly." },
        { status: 502 }
      );
    }
  }

  try {
    let conversation: Anthropic.MessageParam[] = trimmed.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let leadSaved = false;

    for (let round = 0; round < 3; round++) {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 400,
        system: buildSystemPrompt(body?.projectSlug),
        tools: [SAVE_LEAD_TOOL],
        messages: conversation,
      });

      if (response.stop_reason !== "tool_use") {
        const text = stripMarkdownEmphasis(
          response.content
            .filter((block): block is Anthropic.TextBlock => block.type === "text")
            .map((block) => block.text)
            .join("\n")
        );
        return NextResponse.json({ reply: text, leadSaved });
      }

      conversation = [...conversation, { role: "assistant", content: response.content }];

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use" || block.name !== "save_lead") continue;
        const input = block.input as {
          name: string;
          email: string;
          business_name?: string;
          business_type?: string;
          help_with?: string;
        };
        await saveLead(input, "chat_widget");
        leadSaved = true;
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: "Saved — let the visitor know a real person will follow up soon.",
        });
      }

      conversation = [...conversation, { role: "user", content: toolResults }];
    }

    return NextResponse.json({
      reply: "Thanks for the details — someone from the team will follow up soon.",
      leadSaved,
    });
  } catch (error) {
    console.error("Anthropic chat request failed:", error);
    return NextResponse.json(
      { error: "The AI assistant is temporarily unavailable — please try again shortly." },
      { status: 502 }
    );
  }
}
