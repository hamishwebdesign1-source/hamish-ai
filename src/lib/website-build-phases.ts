import Anthropic from "@anthropic-ai/sdk";
import { stripMarkdownEmphasis } from "@/lib/strip-markdown-emphasis";
import { AI_CODING_TOOLS, type ToolId } from "@/lib/ai-coding-tools";
import type { WebsiteBrief } from "@/lib/website-brief";

// AI Website Creation Guide, WB2 — the technical heart of the whole
// capability: real, phase-by-phase instructions for an external agentic
// coding tool, generated from the Website Brief. Deliberately NOT one
// giant prompt (the brief's own §5).
//
// Generated one phase per call, not one call for all 10 (or even 2-3
// per call) — this app runs on Vercel's Hobby plan (confirmed directly
// with the user), which caps a serverless function at 60 seconds. Two
// real findings from live-testing forced this down to one phase per
// call, not just "small groups":
// 1. A single call for all 10 phases took 90-150s locally.
// 2. In actual production use, 2-3-phase groups fired via Promise.all
//    did NOT run concurrently the way the client assumed — the real
//    request log showed them landing 25-90 seconds apart, effectively
//    sequential, and the last two groups (already queued behind four
//    others) had their Anthropic calls come back malformed on both
//    retry attempts. The old code's "return best-effort content rather
//    than nothing" fallback then silently saved placeholder text for
//    4 of 10 phases with no error shown to the user at all — a real,
//    serious bug found by actually creating a project end to end, not
//    a theoretical risk. See requestWebsiteBuildPhase() and the caller
//    in website-builder/actions.ts for the fix: strict per-phase
//    failure (never silently degraded), and the client now generates
//    sequentially with an honest "phase X of 10" progress readout
//    instead of a misleading "parallel" one.
//
// WB9: generation is now also incrementally SAVED, not just
// sequentially requested — each phase lands in the DB and becomes
// immediately usable (checklist-checkable, advanceable) the moment it's
// ready, rather than the agency waiting for all 10 before any of them
// are real. See startBuildPhaseGeneration()/generateNextBuildPhase() in
// website-builder/actions.ts.

export type BuildPhaseId =
  | "setup"
  | "design_system"
  | "homepage"
  | "remaining_pages"
  | "responsive"
  | "seo"
  | "accessibility"
  | "qa"
  | "polish"
  | "deployment";

export const BUILD_PHASE_ORDER: BuildPhaseId[] = [
  "setup",
  "design_system",
  "homepage",
  "remaining_pages",
  "responsive",
  "seo",
  "accessibility",
  "qa",
  "polish",
  "deployment",
];

export const BUILD_PHASE_LABELS: Record<BuildPhaseId, string> = {
  setup: "Project setup",
  design_system: "Design system",
  homepage: "Homepage",
  remaining_pages: "Remaining pages",
  responsive: "Responsive design",
  seo: "SEO",
  accessibility: "Accessibility",
  qa: "QA",
  polish: "Final polish",
  deployment: "Deployment",
};

export type ChecklistItem = { item: string; done: boolean };
export type BuildPhase = { id: BuildPhaseId; name: string; instructions: string; checklist: ChecklistItem[] };

// Exported for website-troubleshooting.ts to reuse — one summary format
// for the brief across every AI call that needs it, rather than two
// copies that can quietly drift apart over time.
export function briefSummary(brief: WebsiteBrief): string {
  return `Business overview: ${brief.businessOverview}
Target audience: ${brief.targetAudience}
Objectives: ${brief.objectives.join("; ")}
Sitemap: ${brief.sitemap.map((s) => `${s.page} (${s.purpose})`).join("; ")}
Content requirements: ${brief.contentRequirements.join("; ")}
Brand guidelines: ${brief.brandGuidelines}
Design direction: ${brief.designDirection}
CTA strategy: ${brief.ctaStrategy}
SEO requirements: ${brief.seoRequirements.join("; ")}
Analytics requirements: ${brief.analyticsRequirements.join("; ")}
Technical requirements: ${brief.technicalRequirements.join("; ")}
Acceptance criteria: ${brief.acceptanceCriteria.join("; ")}`;
}

const PHASE_BRIEFS: Record<BuildPhaseId, string> = {
  setup:
    "Project scaffolding only (NOT installing the AI coding tool itself — that's handled separately). Tell the agent to set up a new project using a simple, modern, appropriate stack for a small business marketing site (no unnecessary complexity — no database or backend needed unless the brief's technical requirements genuinely call for one), initialise version control, and confirm it runs locally.",
  design_system: "Typography, colours, spacing, and reusable components (buttons, cards, forms) matching the brief's brand guidelines and design direction.",
  homepage: "Build the homepage specifically, referencing its real purpose from the sitemap and the brief's CTA strategy.",
  remaining_pages: "Build every other page from the sitemap, each with its own real purpose from the brief.",
  responsive: "Make every page work properly on mobile, tablet, and desktop.",
  seo: "Metadata, heading structure, and technical SEO matching the brief's real SEO requirements.",
  accessibility: "Keyboard navigation, ARIA, contrast, alt text, focus states.",
  qa: "A comprehensive quality pass covering design consistency, UX/navigation/CTAs/forms, all three device sizes, SEO basics, accessibility, performance, and security (no secrets/API keys committed) — broader than the earlier phases since this is the full-website checkpoint.",
  polish: "Visual quality improvements: hierarchy, spacing, consistency, making the site feel premium, matching the brief's acceptance criteria.",
  deployment: "Deploy the finished site (a real, common hosting option appropriate for the stack chosen in Phase 1) and connect analytics per the brief's analytics requirements.",
};

function buildSystemPrompt(brief: WebsiteBrief, toolId: ToolId, phaseIds: BuildPhaseId[]): string {
  const tool = AI_CODING_TOOLS[toolId];
  const phaseList = phaseIds
    .map((id) => `- ${id} (Phase ${BUILD_PHASE_ORDER.indexOf(id) + 1} of 10, "${BUILD_PHASE_LABELS[id]}"): ${PHASE_BRIEFS[id]}`)
    .join("\n");

  return `You are writing part of a phase-by-phase AI Build Prompt package for an agency's website project. The agency will paste each phase's instructions, one at a time, into ${tool.name} (an agentic coding assistant that writes, runs, and tests code itself) — never dump everything as one giant prompt, and never assume the agency member reading this understands code. This project has 10 phases total; you're writing only the ones listed below, but the agent will already have completed every earlier phase by the time it sees these, so you can assume the project, design system, and earlier pages already exist as described in the brief.

Website Build Brief (the source of truth — ground every phase in these real specifics, never generic web-design advice):
${briefSummary(brief)}

Write instructions for exactly these phases, in order:
${phaseList}

Each phase's "instructions" field is written AS IF SPEAKING DIRECTLY TO THE CODING AGENT (second person, imperative — "Build the homepage with...") so the agency can copy-paste it verbatim. Reference the actual brief content throughout — page names, real content requirements, real design direction — never filler like "add appropriate content."

For each phase also write a "checklist" — 4-7 short, concrete, checkable statements (not full sentences) someone with no coding knowledge could verify are true, e.g. "Homepage loads with no errors", "Navigation menu works on mobile". These are how the agency confirms the AI agent actually finished the phase before moving on.`;
}

const BUILD_PHASES_TOOL: Anthropic.Tool = {
  name: "submit_build_phases",
  description: "Submit build instructions and a completion checklist for the requested phases.",
  input_schema: {
    type: "object",
    properties: {
      phases: {
        type: "array",
        items: {
          type: "object",
          properties: {
            phaseId: { type: "string", enum: BUILD_PHASE_ORDER },
            instructions: { type: "string" },
            checklist: { type: "array", items: { type: "string" } },
          },
          required: ["phaseId", "instructions", "checklist"],
        },
      },
    },
    required: ["phases"],
  },
};

// Same defensive-coercion instinct as website-brief.ts's stripBrief() —
// never assume the model's tool call actually matches the schema.
// Reconciled against the requested phaseIds rather than trusted as-is:
// any phase the model omitted or mis-shaped gets a real (if minimal)
// fallback instead of silently vanishing from the sequence.
// Exported for website-build-phases.test.ts — this is the actual fix for
// the real production bug this file's own header documents (malformed
// tool-call output silently saved as placeholder content, no error
// shown), so it's worth testing directly rather than only through the
// Anthropic-calling function that wraps it.
export function reconcilePhases(raw: unknown, phaseIds: BuildPhaseId[]): BuildPhase[] {
  const list = Array.isArray(raw) ? raw : [];
  const byId = new Map<string, { instructions: string; checklist: string[] }>();
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.phaseId !== "string" || !BUILD_PHASE_ORDER.includes(e.phaseId as BuildPhaseId)) continue;
    const instructions = typeof e.instructions === "string" ? stripMarkdownEmphasis(e.instructions) : "";
    const checklist = Array.isArray(e.checklist) ? e.checklist.filter((c): c is string => typeof c === "string").map(stripMarkdownEmphasis) : [];
    byId.set(e.phaseId, { instructions, checklist });
  }

  return phaseIds.map((id) => {
    const found = byId.get(id);
    const hasRealContent = found && found.instructions.length > 0 && found.checklist.length > 0;
    return {
      id,
      name: BUILD_PHASE_LABELS[id],
      instructions: hasRealContent ? found.instructions : `Ask your AI coding agent to work on: ${BUILD_PHASE_LABELS[id]}. Describe what's needed for this phase based on your Website Brief, then review its work before continuing.`,
      checklist: (hasRealContent ? found.checklist : ["This phase's work is complete and reviewed"]).map((item) => ({ item, done: false })),
    };
  });
}

export function isWellFormed(phases: BuildPhase[]): boolean {
  const realCount = phases.filter((p) => !p.instructions.startsWith("Ask your AI coding agent to work on:")).length;
  return realCount === phases.length;
}

const BUILD_PHASES_MODEL = process.env.ANTHROPIC_MODEL_WEBSITE_BUILD_PHASES || "claude-sonnet-5";

async function requestPhaseGroup(anthropic: Anthropic, brief: WebsiteBrief, toolId: ToolId, phaseIds: BuildPhaseId[]): Promise<BuildPhase[] | null> {
  const response = await anthropic.messages.create({
    model: BUILD_PHASES_MODEL,
    max_tokens: 3000,
    system: buildSystemPrompt(brief, toolId, phaseIds),
    tools: [BUILD_PHASES_TOOL],
    tool_choice: { type: "tool", name: "submit_build_phases" },
    messages: [{ role: "user", content: `Write the build instructions for: ${phaseIds.map((id) => BUILD_PHASE_LABELS[id]).join(", ")}.` }],
  });

  const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
  if (!toolUse) return null;
  const input = toolUse.input as { phases?: unknown };
  return reconcilePhases(input.phases, phaseIds);
}

// Generates one phase's instructions — always well inside the 60s Hobby
// plan cap, and small enough that a real failure is cheap to retry (see
// the file header). The caller (a Server Action, see
// website-builder/actions.ts) calls this once per phase and combines
// the results; nothing here writes to a database.
//
// Never returns degraded/placeholder content as if it were a success —
// this is the actual fix for the real bug found live-testing: the old
// version's last attempt returned "best-effort" content unconditionally,
// so a genuinely failed generation silently saved as if it had worked.
// Three attempts (not two) before giving up, since production latency
// and occasional malformed output both turned out more common under
// real load than local testing suggested.
export async function generateBuildPhaseGroup(
  brief: WebsiteBrief,
  toolId: ToolId,
  phaseIds: BuildPhaseId[]
): Promise<{ phases: BuildPhase[] } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY is not configured." };

  const anthropic = new Anthropic({ apiKey });
  const label = phaseIds.map((id) => BUILD_PHASE_LABELS[id]).join(", ");

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const phases = await requestPhaseGroup(anthropic, brief, toolId, phaseIds);
      if (phases && isWellFormed(phases)) return { phases };
    }
    return { error: `Couldn't produce complete instructions for ${label} after several attempts — try again.` };
  } catch (error) {
    console.error(`Failed to generate build phase(s) [${label}]:`, error);
    return { error: `The build prompt generator is temporarily unavailable for ${label}.` };
  }
}
