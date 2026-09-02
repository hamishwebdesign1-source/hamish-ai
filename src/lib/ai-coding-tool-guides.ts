import type { ToolId } from "@/lib/ai-coding-tools";

// AI Website Creation Guide, WB4 — the dedicated "Using Claude Code /
// Codex / Cursor" walkthrough pages scoped out of WB1-3 (plan doc §6-8).
// Same principle as ai-coding-tools.ts: kept as plain data, separate from
// both the recommendation logic and the AI-generated build instructions,
// so updating what a tool's workflow looks like today is a data edit,
// not a prompt rewrite. Deliberately hand-written and durable rather than
// AI-generated per project — this is tool documentation, not
// project-specific content, so it doesn't belong behind an AI call.
//
// Content enrichment pass — the original version covered the basics of
// each tool well but stayed thin (2-3 items per section). Deepened with
// more of the specific, practical detail a real agency running their
// first few builds actually hits — without inventing pricing, version
// numbers, or feature claims this app can't keep verifiably current;
// every addition below is workflow guidance, the one category of fact
// that stays true regardless of which exact release someone's running.
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
      "If you'd rather work inside an editor than a bare terminal, Claude Code also runs as an extension inside VS Code and JetBrains IDEs — same underlying tool, just with the terminal panel docked next to your files instead of standing alone.",
    ],
    workingWithIt: [
      "You type or paste an instruction, and Claude Code writes files, runs commands, and reports back — all in the same terminal session, in plain language.",
      "Before anything it considers risky (deleting files, running a command that changes your system), it will ask permission first. Read these prompts properly rather than reflexively approving them.",
      "You can interrupt it at any point by just typing your next message — it doesn't need to finish a thought before you redirect it.",
      "It keeps a running memory of the current conversation, so you can refer back to something from three messages ago (\"go back and fix the hero section like you did for the about page\") without re-explaining it from scratch.",
    ],
    makingTheMostOfIt: [
      "Paste one phase's instructions at a time using the Copy Instructions button on each phase — not all ten at once. Claude Code works best with one clear task in view, and the phase order exists precisely so it isn't building the homepage before the design system is settled.",
      "After each phase finishes, actually open the site locally and look at what it built before ticking off the checklist. The checklist is there to force a genuine review, not as a formality to click through.",
      "If a phase's result doesn't match the brief, describe the specific problem back to it — \"the hero section is missing the catering CTA\" — rather than starting the phase over. It can usually fix its own work faster than a fresh attempt gets you back to the same point.",
      "For a genuinely large or ambiguous ask (\"redesign the whole site to feel more premium\"), ask it to plan first before it starts changing files — it can lay out what it intends to touch and why, which you can review and correct before a single line changes.",
      "It can read a screenshot if you paste or describe one — useful for \"make it look like this\" reference images, or for showing it exactly what's broken rather than describing it in words alone.",
    ],
    commonIssues: [
      { issue: "\"claude: command not found\" after installing", fix: "Node.js or the global install didn't complete properly — reinstall Node.js from nodejs.org, then close and reopen your terminal before running the install command again." },
      { issue: "It stops responding partway through a task", fix: "Press Ctrl+C once to interrupt, then re-describe what's left to finish — no need to restart the whole phase." },
      { issue: "What it built doesn't match the brief", fix: "Tell it exactly what's wrong in plain language rather than re-running the phase from scratch." },
      { issue: "It keeps asking permission for the same routine command", fix: "You can approve a specific command type for the rest of the session when the prompt appears, rather than confirming it every single time it comes up." },
      { issue: "A change looks right in the terminal's description but isn't right when you open the site", fix: "Always verify by actually opening the local site — its own confidence that a change worked isn't a substitute for looking at it yourself." },
    ],
    goodHabits: [
      "Let it make git commits as it goes — most phase instructions already ask for this — so you have a real undo point if a later phase goes wrong.",
      "Skim the files it changed before moving to the next phase, even briefly.",
      "Use one project folder per website. Don't reuse a folder across different clients' builds.",
      "Keep instructions specific and scoped — \"fix the spacing on the pricing cards\" gets a better result than \"make it look nicer\" every time.",
    ],
  },
  cursor: {
    gettingSetUp: [
      "Cursor is a full code editor, so setup means downloading and installing it like any desktop app, then opening a folder for the project the same way you would in VS Code.",
      "The Agent panel (Cmd/Ctrl+I, or the chat icon in the sidebar) is where the actual building happens — make sure it's switched to Agent mode, not plain Chat mode, before you start.",
      "If you've used VS Code before, most of Cursor's own interface (file explorer, terminal, extensions) will already feel familiar — the AI panel is what's genuinely new.",
    ],
    workingWithIt: [
      "You describe what you want in the Agent panel, and changes appear as a visual diff directly in the editor — you can see exactly what's being added, removed, or changed line by line.",
      "Nothing is final until you accept it. You can review a change, ask for a tweak, or reject it outright before it's applied.",
      "The built-in terminal (View > Terminal) lets you run the site locally without leaving the editor, so you can check a phase's work immediately.",
      "You can reference a specific file directly in your instruction (typing @ brings up a file picker) when you want it working on exactly one file rather than searching the whole project for context.",
    ],
    makingTheMostOfIt: [
      "Use the visual diff to actually read what changed before accepting — this is Cursor's real advantage over a terminal-only tool, so it's worth using properly rather than accepting everything on autopilot.",
      "Paste one phase's instructions at a time via the Copy Instructions button, the same discipline as any other tool — Cursor being visual doesn't mean it handles ten phases at once any better.",
      "Start a fresh chat thread for each new phase. A long-running thread accumulates context that can make later phases drift from what the brief actually asked for.",
      "When a change is close but not quite right, accept the parts that are correct and describe only what's left wrong, rather than rejecting the whole diff and starting over.",
      "For a design tweak you can describe visually (\"more padding here\", \"this should be the accent colour\"), click directly on the element in the preview if your version of Cursor supports it — pointing beats describing coordinates in words.",
    ],
    commonIssues: [
      { issue: "The Agent panel seems to be missing or greyed out", fix: "Update Cursor to the latest version from cursor.com — the agent panel is actively developed and older versions can lag behind." },
      { issue: "Changes aren't applying to your files", fix: "Check the panel is set to Agent mode rather than Chat mode — Chat mode only talks, it doesn't edit files." },
      { issue: "Responses feel slow or the agent seems stuck on old context", fix: "Start a new chat thread rather than continuing an old one." },
      { issue: "It edited a file you didn't expect it to touch", fix: "Reject that part of the diff and be more specific about which file/section the next instruction should be scoped to." },
      { issue: "The local dev server won't start after a change", fix: "Check the built-in terminal for the actual error message and paste it back to the agent — it can usually diagnose its own mistake faster than you can from the error alone." },
    ],
    goodHabits: [
      "Read the diff before accepting, every time — not just for the phases that feel important.",
      "Keep one chat thread per phase for cleaner context and easier troubleshooting later.",
      "Run the dev server in Cursor's terminal and actually look at the site after each phase, not just the code.",
      "Commit to git after each phase you've reviewed and accepted, so a bad later change is easy to roll back from a known-good point.",
    ],
  },
  codex: {
    gettingSetUp: [
      "Codex works against a real GitHub repository, so setup means creating a free GitHub account (if you don't have one) and an empty repository for the project before installing anything.",
      "Install the Codex CLI or IDE extension per OpenAI's current setup guide, then connect it to the repository you created — that connection is what it reads from and writes to for the whole build.",
      "If your machine doesn't already have Git installed, install it first (git-scm.com) — Codex's whole workflow assumes a working local Git setup underneath it.",
    ],
    workingWithIt: [
      "Codex works from a real repository rather than a loose folder, so its changes often show up as commits or pull requests against that repo rather than silent file edits.",
      "Depending on how it's configured, it may work directly on a branch or open a PR for you to review — either way, the repo's history is your record of what happened at each phase.",
      "Give it one clear instruction at a time and let it finish before adding a new one — it's built for scoped, repository-grounded tasks rather than an open-ended back-and-forth.",
      "Because everything lands as a commit or PR, you always have a real, inspectable diff to review — even weeks later, you can trace exactly which phase introduced a given line.",
    ],
    makingTheMostOfIt: [
      "Paste one phase's instructions at a time via the Copy Instructions button — Codex being repo-based doesn't change the reason for going phase by phase, it keeps each change reviewable on its own.",
      "Review the diff or PR for a phase before merging it, the same way you'd review any teammate's pull request, rather than merging on trust.",
      "Treat the repo's main branch as the known-good state between phases — merge a phase's work only once you've actually checked it against the brief.",
      "Use PR comments to point at a specific line or block if something's wrong, the same way you'd leave review feedback for a human developer — it's built to work with exactly that kind of scoped, in-context correction.",
      "If a phase's branch drifts too far from what the brief asked for, it's often faster to close that PR and re-run the phase from the last good main than to keep patching a branch that's gone the wrong direction.",
    ],
    commonIssues: [
      { issue: "It can't connect to your repository", fix: "Re-authenticate the CLI or extension against GitHub and confirm the repository you created is the one it's pointed at." },
      { issue: "It opened a PR with changes you didn't expect", fix: "Review the diff before merging, and reply on the PR with what's wrong rather than merging and fixing it after — same discipline as reviewing a colleague's code." },
      { issue: "The local environment doesn't match what it assumed", fix: "Check the repository's own install/setup instructions (README, package.json) match what's actually installed on your machine." },
      { issue: "A phase's PR has merge conflicts with main", fix: "Make sure you're always working from the latest merged main before starting the next phase — conflicts usually mean a phase started from an outdated branch." },
      { issue: "It's unclear whether a task actually finished", fix: "Check the PR or commit status directly in GitHub rather than relying on the CLI output alone — the repository's own state is the source of truth." },
    ],
    goodHabits: [
      "Review every PR or diff before merging — don't auto-merge, even for phases that seem straightforward.",
      "Keep commits scoped to one phase at a time so the repo history reads as a clear build log.",
      "Pull the latest main branch before starting each new phase so Codex is always working from the reviewed, merged state.",
      "Use descriptive PR titles per phase (\"Phase 3: Homepage build\") so the repo's history is genuinely useful if you ever have to hand this project to someone else.",
    ],
  },
};
