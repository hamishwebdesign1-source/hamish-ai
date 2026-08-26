import Anthropic from "@anthropic-ai/sdk";
import {
  STAT_CARD_IDS,
  SECTION_TYPES,
  STAT_LABELS,
  SECTION_LABELS,
  CHART_METRIC_LABELS,
  CHART_KIND_LABELS,
  sanitizeBlocksForWrite,
  type Block,
} from "@/lib/command-centre-layout";
import { logAiCall } from "@/lib/ai-call-log";

// Command Centre Phase 5d — the AI Design Assistant (§23). Structurally a
// sibling of the AI Business Analyst (answer-clients-question.ts): same
// Anthropic SDK usage, same env vars, same try/catch-and-return-an-error
// shape. The real difference is the output — this returns a *proposed
// Block[]*, not prose, via tool use so the model's response is
// structurally constrained rather than free text we'd have to parse.
//
// Trust boundary: the model's proposal is NEVER written to the database
// directly, and never trusted more than a hand-filled form. It runs
// through sanitizeBlocksForWrite() — the exact same validator the manual
// builder's save path uses — before the caller ever sees it, and even
// then this function only *returns* a proposal for the settings panel to
// load into its own draft state. The existing updateCommandCentreLayout()
// Server Action, unchanged, is still the only thing that ever persists a
// layout — the human still clicks Save.

const BLOCK_TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    id: {
      type: "string",
      description:
        "Unique id for this block. Reuse the exact id from the current layout if you're keeping or modifying an existing block; invent a short new one like 'chart:new1' only for a block you're adding.",
    },
    type: {
      type: "string",
      enum: [
        "stat",
        "actions_required",
        "insights",
        "briefing",
        "engagement_risk",
        "model_performance",
        "client_ai_adoption",
        "top_prospects",
        "recent_activity",
        "chart",
        "text",
        "cta",
      ],
    },
    cardId: { type: "string", enum: STAT_CARD_IDS, description: "Required, and only used, when type is 'stat'." },
    metric: { type: "string", enum: ["revenue", "prospects"], description: "Required, and only used, when type is 'chart'." },
    kind: { type: "string", enum: ["area", "bar"], description: "Required, and only used, when type is 'chart'." },
    title: { type: "string", description: "Required, and only used, when type is 'text'. Max 60 characters." },
    body: { type: "string", description: "Required, and only used, when type is 'text'. Max 500 characters." },
    label: { type: "string", description: "Required, and only used, when type is 'cta'. Max 40 characters." },
    href: {
      type: "string",
      description: "Required, and only used, when type is 'cta'. Must start with '/' (an in-app page) or 'https://'.",
    },
    span: {
      type: "integer",
      enum: [1, 2],
      description:
        "1 = standard width, 2 = double width. Omit for actions_required/insights/briefing/engagement_risk/model_performance/client_ai_adoption/top_prospects/recent_activity, which always render full width.",
    },
  },
  required: ["id", "type"],
};

const PROPOSE_LAYOUT_TOOL: Anthropic.Tool = {
  name: "propose_layout",
  description: "Propose a new Command Centre block layout for the agency's Settings page to load as a draft for review, or explain that the instruction can't be confidently mapped to one.",
  input_schema: {
    type: "object",
    properties: {
      outcome: { type: "string", enum: ["proposal", "unable"] },
      blocks: {
        type: "array",
        items: BLOCK_TOOL_SCHEMA,
        description: "The full new ordered list of blocks — not a diff. Required when outcome is 'proposal'.",
      },
      summary: { type: "string", description: "One short sentence describing what changed and why. Required when outcome is 'proposal'." },
      reason: {
        type: "string",
        description: "Plain-language explanation of why the instruction can't be confidently turned into a layout change. Required when outcome is 'unable'.",
      },
    },
    required: ["outcome"],
  },
};

function describeBlock(block: Block): string {
  if (block.type === "stat") return `stat card "${STAT_LABELS[block.cardId]}" (id ${block.id}, width ${block.span === 2 ? "double" : "standard"})`;
  if (block.type === "chart") return `chart of ${CHART_METRIC_LABELS[block.metric]} as a ${CHART_KIND_LABELS[block.kind]} chart (id ${block.id}, width ${block.span === 2 ? "double" : "standard"})`;
  if (block.type === "text") return `text block titled "${block.title}" (id ${block.id})`;
  if (block.type === "cta") return `call-to-action "${block.label}" linking to ${block.href} (id ${block.id})`;
  return `${SECTION_LABELS[block.type]} section (id ${block.id}, always full width)`;
}

function buildSystemPrompt(currentBlocks: Block[]): string {
  return `You are the AI Design Assistant for a Studio agency's Command Centre — a no-code layout editor. The agency owner describes a change in plain English; you propose a new block layout by calling propose_layout.

Available block types:
- stat: one of 5 fixed cards — ${STAT_CARD_IDS.map((id) => `"${id}" (${STAT_LABELS[id]})`).join(", ")}. Each can appear at most once.
- actions_required, insights, briefing, engagement_risk, model_performance, client_ai_adoption, top_prospects, recent_activity: fixed section blocks (${SECTION_TYPES.map((t) => `"${SECTION_LABELS[t]}"`).join(", ")}). Each can appear at most once. Always full width — never set span on these. engagement_risk lists clients who've gone quiet or fallen behind on an invoice — it's rule-based on real request/invoice dates, not a prediction. model_performance shows real success rate, latency and cost for this org's own AI Design Assistant and AI Business Analyst calls. client_ai_adoption shows what share of active clients have the AI chatbot feature turned on for their own website. top_prospects lists this org's own researched prospects ranked by their real score, up to 5 — the same ranking briefing's own best-opportunity box is drawn from. recent_activity is a real, dated feed of what's happened across the client roster — new clients, requests received and replied to, invoices paid, projects started — up to 8 most recent, newest first.
- chart: a real chart of either "revenue" or "prospects" (the only two metrics with real data), rendered as "area" or "bar".
- text: a free-form note with a title and body — use this for anything the agency wants to say that isn't a stat, chart, or link.
- cta: a button linking to an internal page (starting with "/") or an external https:// page.

The current layout, in order:
${currentBlocks.length ? currentBlocks.map((b, i) => `${i + 1}. ${describeBlock(b)}`).join("\n") : "(empty)"}

Rules:
- Never invent a stat card, chart metric, or data source that isn't listed above — there is no revenue-by-region, no ad spend, no website traffic. Only what's listed above is real.
- A block missing from the current layout that's a stat/section type is simply hidden, not deleted — you may re-add it.
- Return the FULL new ordered list of blocks in "blocks", not just the changes.
- If the instruction is too vague to act on (e.g. "make it better"), asks for something none of the block types support (e.g. a live map, a competitor comparison), or you genuinely can't map it to a concrete layout, call propose_layout with outcome "unable" and a plain-language reason — never guess.
- Keep "summary" to one short, concrete sentence a non-technical person would understand.`;
}

export type DesignAssistantResult =
  | { outcome: "proposal"; blocks: Block[]; summary: string }
  | { outcome: "unable"; reason: string }
  | { error: string };

export async function proposeCommandCentreLayout(orgId: string, currentBlocks: Block[], instruction: string): Promise<DesignAssistantResult> {
  const trimmed = instruction.trim();
  if (!trimmed) return { error: "Describe what you'd like to change." };
  if (trimmed.length > 500) return { error: "Keep the instruction under 500 characters." };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." };

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  // Measured from just before the real API call, not from function
  // entry — the validation returns above aren't call attempts at all,
  // and logAiCall() below is only ever reached once a real attempt was
  // made. Single log point at the end (not one per return branch)
  // because "unable" is deliberately still a success: the assistant
  // correctly declining an instruction it can't confidently map is the
  // model doing its job, not a malfunction — see buildSystemPrompt()'s
  // own "never guess" rule. Only an exception or a response that fails
  // basic shape validation counts against it.
  const startedAt = Date.now();
  let result: DesignAssistantResult;
  let usage: Anthropic.Usage | undefined;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      system: buildSystemPrompt(currentBlocks),
      messages: [{ role: "user", content: trimmed }],
      tools: [PROPOSE_LAYOUT_TOOL],
      tool_choice: { type: "tool", name: "propose_layout" },
    });
    usage = response.usage;

    const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    if (!toolUse) {
      result = { error: "The design assistant did not return a proposal." };
    } else {
      const input = toolUse.input as { outcome?: unknown; blocks?: unknown; summary?: unknown; reason?: unknown };

      if (input.outcome === "unable") {
        const reason =
          typeof input.reason === "string" && input.reason.trim() ? input.reason.trim() : "Couldn't map that to a concrete layout change.";
        result = { outcome: "unable", reason };
      } else {
        // Never trust the model's output more than a hand-filled form —
        // the exact same validator the manual builder's save path runs
        // through.
        const sanitized = sanitizeBlocksForWrite(input.blocks);
        if (!sanitized) {
          result = { error: "The design assistant's proposal didn't include any valid blocks — try rephrasing." };
        } else {
          const summary = typeof input.summary === "string" && input.summary.trim() ? input.summary.trim() : "Layout updated.";
          result = { outcome: "proposal", blocks: sanitized, summary };
        }
      }
    }
  } catch (error) {
    console.error("Command Centre design assistant failed:", error);
    result = { error: "The design assistant is temporarily unavailable." };
  }

  await logAiCall(orgId, "design_assistant", {
    success: "outcome" in result,
    latencyMs: Date.now() - startedAt,
    inputTokens: usage?.input_tokens,
    outputTokens: usage?.output_tokens,
  });
  return result;
}
