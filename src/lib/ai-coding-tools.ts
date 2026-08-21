// AI Website Creation Guide, WB2 — which AI coding tool to recommend,
// and each tool's actual setup mechanics, kept as plain data separate
// from both the recommendation logic and the AI-generated build
// instructions. This is the architecture plan's own answer to "how do
// we keep instructions current as the tools change" — updating what
// Cursor can do today is a one-line edit here, not a prompt rewrite.

export type ToolId = "claude_code" | "codex" | "cursor";

export type ToolProfile = {
  id: ToolId;
  name: string;
  description: string;
  // A short, tool-specific preamble prepended to the AI-generated
  // Phase 1 (Setup) instructions — install/open/paste mechanics, the
  // one part of the build process that's genuinely tool-specific rather
  // than "agentic coding assistant in general."
  setupPreamble: string;
  hasVisualEditing: boolean;
  highAutomation: boolean;
  needsExistingEnvironment: boolean;
};

export const AI_CODING_TOOLS: Record<ToolId, ToolProfile> = {
  claude_code: {
    id: "claude_code",
    name: "Claude Code",
    description: "A terminal-based agentic coding assistant — you describe what you want, it writes, runs, and tests the code itself.",
    setupPreamble:
      "1. Install Node.js if you don't already have it (nodejs.org).\n2. Open a terminal and run: npm install -g @anthropic-ai/claude-code\n3. Create a folder for this website project and open a terminal inside it.\n4. Run: claude\n5. You're now talking to Claude Code directly in your terminal — paste the instructions below when ready.",
    hasVisualEditing: false,
    highAutomation: true,
    needsExistingEnvironment: false,
  },
  cursor: {
    id: "cursor",
    name: "Cursor",
    description: "A full code editor (like VS Code) with an AI agent built in — you can watch and guide changes visually as they happen.",
    setupPreamble:
      "1. Download and install Cursor from cursor.com.\n2. Open Cursor and create a new folder for this website project (File > Open Folder).\n3. Open the Agent panel (Cmd/Ctrl+I or the chat icon in the sidebar) and switch it to Agent mode.\n4. Paste the instructions below into the Agent chat when ready.",
    hasVisualEditing: true,
    highAutomation: true,
    needsExistingEnvironment: false,
  },
  codex: {
    id: "codex",
    name: "OpenAI Codex",
    description: "OpenAI's coding agent — works from the command line or as an IDE extension, connected to a real code repository.",
    setupPreamble:
      "1. Create a free GitHub account if you don't have one, and create a new empty repository for this website project.\n2. Install the Codex CLI or IDE extension per OpenAI's current setup guide (platform.openai.com/docs/codex).\n3. Connect it to the repository you created.\n4. Paste the instructions below when ready to start.",
    hasVisualEditing: false,
    highAutomation: true,
    needsExistingEnvironment: true,
  },
};

export type ToolQuizAnswers = {
  technicalLevel: "beginner" | "intermediate" | "advanced";
  hasCodingEnvironment: boolean;
  wantsMaxAutomation: boolean;
  wantsVisualEditing: boolean;
};

export type ToolRecommendation = { toolId: ToolId; reason: string };

// Deliberately a plain decision tree, not an AI call — this is a
// straightforward preference match against real, current tool
// capabilities (the data above), not something that benefits from an
// LLM's judgement, and it's instant and free to run as often as someone
// changes their answers.
export function recommendTool(answers: ToolQuizAnswers): ToolRecommendation {
  if (answers.wantsVisualEditing) {
    return { toolId: "cursor", reason: "Best suited to this project because you want to watch and guide changes visually inside a real editor, not just a terminal." };
  }
  if (answers.technicalLevel === "beginner" && answers.wantsMaxAutomation) {
    return { toolId: "claude_code", reason: "Best suited to this project because you want an agentic workflow with minimal manual coding, and no existing coding environment to set up first." };
  }
  if (answers.hasCodingEnvironment && answers.technicalLevel !== "beginner") {
    return { toolId: "codex", reason: "Best suited to this project because you already work with a code repository and want an agent that plugs directly into it." };
  }
  return { toolId: "claude_code", reason: "The most beginner-friendly path to a fully agentic build — install one tool, describe what you want, and it handles the rest." };
}
