import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chat-system-prompt";
import { getFallbackReply } from "@/lib/chat-fallback";
import { saveLead } from "@/lib/save-lead";
import { isRateLimited, getClientKey } from "@/lib/chat-rate-limit";
import { getCaseStudy } from "@/lib/case-studies-data";

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
        const text = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("\n");
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
