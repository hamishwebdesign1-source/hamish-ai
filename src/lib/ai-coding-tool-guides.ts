import type { ToolId } from "@/lib/ai-coding-tools";

// AI Website Creation Guide, WB4 — the dedicated "Using Claude Code /
// Codex / Cursor" walkthrough pages scoped out of WB1-3 (plan doc §6-8).
// Same principle as ai-coding-tools.ts: kept as plain data, separate from
// both the recommendation logic and the AI-generated build instructions,
// so updating what a tool's workflow looks like today is a data edit,
// not a prompt rewrite. Deliberately hand-written and durable rather than
// AI-generated per project — this is tool documentation, not
// project-specific content, so it doesn't belong behind an AI call.
export type ToolGuide = {
  gettingSetUp: string[];
  workingWithIt: string[];
  makingTheMostOfIt: string[];
  commonIssues: { issue: string; fix: string }[];
  goodHabits: string[];
};

export const AI_CODING_TOOL_GUIDES: Record<ToolId, ToolGuide> = {
  claude_code: {
    gettingSetUp: [
      "Claude Code runs in a terminal, so the only real setup is Node.js and one install command — no account beyond the one you already use for Claude, and no editor to configure.",
      "Once you run `claude` inside your project folder, that terminal window is your entire interface for the build. Keep it open for the whole project rather than closing and reopening it between phases.",
    ],
    workingWithIt: [
      "You type or paste an instruction, and Claude Code writes files, runs commands, and reports back — all in the same terminal session, in plain language.",
      "Before anything it considers risky (deleting files, running a command that changes your system), it will ask permission first. Read these prompts properly rather than reflexively approving them.",
      "You can interrupt it at any point by just typing your next message — it doesn't need to finish a thought before you redirect it.",
    ],
    makingTheMostOfIt: [
      "Paste one phase's instructions at a time using the Copy Instructions button on each phase — not all ten at once. Claude Code works best with one clear task in view, and the phase order exists precisely so it isn't building the homepage before the design system is settled.",
      "After each phase finishes, actually open the site locally and look at what it built before ticking off the checklist. The checklist is there to force a genuine review, not as a formality to click through.",
      "If a phase's result doesn't match the brief, describe the specific problem back to it — \"the hero section is missing the catering CTA\" — rather than starting the phase over. It can usually fix its own work faster than a fresh attempt gets you back to the same point.",
    ],
    commonIssues: [
      { issue: "\"claude: command not found\" after installing", fix: "Node.js or the global install didn't complete properly — reinstall Node.js from nodejs.org, then close and reopen your terminal before running the install command again." },
      { issue: "It stops responding partway through a task", fix: "Press Ctrl+C once to interrupt, then re-describe what's left to finish — no need to restart the whole phase." },
      { issue: "What it built doesn't match the brief", fix: "Tell it exactly what's wrong in plain language rather than re-running the phase from scratch." },
    ],
    goodHabits: [
      "Let it make git commits as it goes — most phase instructions already ask for this — so you have a real undo point if a later phase goes wrong.",
      "Skim the files it changed before moving to the next phase, even briefly.",
      "Use one project folder per website. Don't reuse a folder across different clients' builds.",
    ],
  },
  cursor: {
    gettingSetUp: [
      "Cursor is a full code editor, so setup means downloading and installing it like any desktop app, then opening a folder for the project the same way you would in VS Code.",
      "The Agent panel (Cmd/Ctrl+I, or the chat icon in the sidebar) is where the actual building happens — make sure it's switched to Agent mode, not plain Chat mode, before you start.",
    ],
    workingWithIt: [
      "You describe what you want in the Agent panel, and changes appear as a visual diff directly in the editor — you can see exactly what's being added, removed, or changed line by line.",
      "Nothing is final until you accept it. You can review a change, ask for a tweak, or reject it outright before it's applied.",
      "The built-in terminal (View > Terminal) lets you run the site locally without leaving the editor, so you can check a phase's work immediately.",
    ],
    makingTheMostOfIt: [
      "Use the visual diff to actually read what changed before accepting — this is Cursor's real advantage over a terminal-only tool, so it's worth using properly rather than accepting everything on autopilot.",
      "Paste one phase's instructions at a time via the Copy Instructions button, the same discipline as any other tool — Cursor being visual doesn't mean it handles ten phases at once any better.",
      "Start a fresh chat thread for each new phase. A long-running thread accumulates context that can make later phases drift from what the brief actually asked for.",
    ],
    commonIssues: [
      { issue: "The Agent panel seems to be missing or greyed out", fix: "Update Cursor to the latest version from cursor.com — the agent panel is actively developed and older versions can lag behind." },
      { issue: "Changes aren't applying to your files", fix: "Check the panel is set to Agent mode rather than Chat mode — Chat mode only talks, it doesn't edit files." },
      { issue: "Responses feel slow or the agent seems stuck on old context", fix: "Start a new chat thread rather than continuing an old one." },
    ],
    goodHabits: [
      "Read the diff before accepting, every time — not just for the phases that feel important.",
      "Keep one chat thread per phase for cleaner context and easier troubleshooting later.",
      "Run the dev server in Cursor's terminal and actually look at the site after each phase, not just the code.",
    ],
  },
  codex: {
    gettingSetUp: [
      "Codex works against a real GitHub repository, so setup means creating a free GitHub account (if you don't have one) and an empty repository for the project before installing anything.",
      "Install the Codex CLI or IDE extension per OpenAI's current setup guide, then connect it to the repository you created — that connection is what it reads from and writes to for the whole build.",
    ],
    workingWithIt: [
      "Codex works from a real repository rather than a loose folder, so its changes often show up as commits or pull requests against that repo rather than silent file edits.",
      "Depending on how it's configured, it may work directly on a branch or open a PR for you to review — either way, the repo's history is your record of what happened at each phase.",
      "Give it one clear instruction at a time and let it finish before adding a new one — it's built for scoped, repository-grounded tasks rather than an open-ended back-and-forth.",
    ],
    makingTheMostOfIt: [
      "Paste one phase's instructions at a time via the Copy Instructions button — Codex being repo-based doesn't change the reason for going phase by phase, it keeps each change reviewable on its own.",
      "Review the diff or PR for a phase before merging it, the same way you'd review any teammate's pull request, rather than merging on trust.",
      "Treat the repo's main branch as the known-good state between phases — merge a phase's work only once you've actually checked it against the brief.",
    ],
    commonIssues: [
      { issue: "It can't connect to your repository", fix: "Re-authenticate the CLI or extension against GitHub and confirm the repository you created is the one it's pointed at." },
      { issue: "It opened a PR with changes you didn't expect", fix: "Review the diff before merging, and reply on the PR with what's wrong rather than merging and fixing it after — same discipline as reviewing a colleague's code." },
      { issue: "The local environment doesn't match what it assumed", fix: "Check the repository's own install/setup instructions (README, package.json) match what's actually installed on your machine." },
    ],
    goodHabits: [
      "Review every PR or diff before merging — don't auto-merge, even for phases that seem straightforward.",
      "Keep commits scoped to one phase at a time so the repo history reads as a clear build log.",
      "Pull the latest main branch before starting each new phase so Codex is always working from the reviewed, merged state.",
    ],
  },
};
