import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { AI_CODING_TOOLS, type ToolId } from "@/lib/ai-coding-tools";
import { briefSummary, type BuildPhase } from "@/lib/website-build-phases";
import type { WebsiteBrief } from "@/lib/website-brief";

// AI Website Creation Guide, WB5 — the troubleshooting composer (plan
// doc §12, deferred out of WB1-3 alongside the tool guide pages). The
// agency describes what's going wrong in plain language; this turns
// that into a plain-language diagnosis plus a ready-to-paste instruction
// for their AI coding tool — never a fix HamishAI applies itself, same
// "you stay in charge of the build" positioning as everything else in
// this capability.

export type TroubleshootingEntry = {
  id: string;
  issue: string;
  diagnosis: string;
  fixPrompt: string;
  createdAt: string;
};

function buildSystemPrompt(brief: WebsiteBrief, toolId: ToolId, phase: BuildPhase | null): string {
  const tool = AI_CODING_TOOLS[toolId];
  const phaseContext = phase
    ? `They're currently on the "${phase.name}" phase. That phase's instructions were:\n${phase.instructions}`
    : "They haven't started a specific build phase yet, or the AI Build Prompt hasn't been generated.";

  return `You are helping an agency member who is building a website using ${tool.name} (an agentic coding assistant), working from a Website Brief. They are NOT a developer and do not want to write or debug code themselves — they will copy your fixPrompt and paste it directly into ${tool.name} to have it make the actual fix. Never tell them to write code or edit a file themselves.

Website Build Brief (ground your diagnosis in these real specifics where relevant):
${briefSummary(brief)}

${phaseContext}

They've described a problem they're stuck on. Write:
1. A short diagnosis (1-3 plain-English sentences, no jargon) of what's most likely causing it.
2. A fixPrompt: a ready-to-paste instruction for ${tool.name}, written AS IF SPEAKING DIRECTLY TO THE CODING AGENT (second person, imperative), that describes the problem and what a correct fix looks like — specific enough to act on, not generic advice like "check your code for errors."

If the problem as described doesn't have enough information to diagnose confidently, say so plainly in the diagnosis and write a fixPrompt that asks the coding agent to investigate and report back, rather than guessing at a fix.`;
}

const TROUBLESHOOTING_TOOL: Anthropic.Tool = {
  name: "submit_troubleshooting_help",
  description: "Submit a diagnosis and a ready-to-paste fix prompt for the agency's coding tool.",
  input_schema: {
    type: "object",
    properties: {
      diagnosis: { type: "string" },
      fixPrompt: { type: "string" },
    },
    required: ["diagnosis", "fixPrompt"],
  },
};

function isWellFormed(result: { diagnosis: string; fixPrompt: string }): boolean {
  return result.diagnosis.trim().length > 0 && result.fixPrompt.trim().length > 0;
}

const TROUBLESHOOTING_MODEL = process.env.ANTHROPIC_MODEL_WEBSITE_TROUBLESHOOTING || "claude-haiku-4-5-20251001";

async function requestTroubleshootingHelp(
  anthropic: Anthropic,
  brief: WebsiteBrief,
  toolId: ToolId,
  phase: BuildPhase | null,
  issue: string
): Promise<{ diagnosis: string; fixPrompt: string } | null> {
  const response = await anthropic.messages.create({
    model: TROUBLESHOOTING_MODEL,
    max_tokens: 1000,
    system: buildSystemPrompt(brief, toolId, phase),
    tools: [TROUBLESHOOTING_TOOL],
    tool_choice: { type: "tool", name: "submit_troubleshooting_help" },
    messages: [{ role: "user", content: `Here's what's going wrong: ${issue}` }],
  });

  const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
  if (!toolUse) return null;
  const input = toolUse.input as { diagnosis?: unknown; fixPrompt?: unknown };
  if (typeof input.diagnosis !== "string" || typeof input.fixPrompt !== "string") return null;
  return { diagnosis: stripMarkdownEmphasis(input.diagnosis), fixPrompt: stripMarkdownEmphasis(input.fixPrompt) };
}

// Two attempts, not three — a real diagnosis call, cheap and fast (Haiku,
// short prompt), and unlike the build phases this isn't a ten-part
// sequence where losing one piece breaks the whole set. Still never
// returns a fabricated "everything looks fine, try again" as if it were
// a real diagnosis — a genuine failure surfaces as a real error.
export async function generateTroubleshootingHelp(
  brief: WebsiteBrief,
  toolId: ToolId,
  phase: BuildPhase | null,
  issue: string
): Promise<{ diagnosis: string; fixPrompt: string } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." };

  const anthropic = new Anthropic({ apiKey });

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await requestTroubleshootingHelp(anthropic, brief, toolId, phase, issue);
      if (result && isWellFormed(result)) return result;
    }
    return { error: "Couldn't put together an answer for that — try rephrasing what's going wrong, or try again." };
  } catch (error) {
    console.error("Failed to generate troubleshooting help:", error);
    return { error: "The troubleshooting assistant is temporarily unavailable." };
  }
}
