import type { BuildPhaseId } from "@/lib/website-build-phases";
import type { PromptCategory } from "@/lib/website-prompt-library";

// Website Builder build-phase flow: decouple personalised content
// visibility from checklist-gated progress (BACKLOG.md, 2026-09-11) —
// per-phase links into the relevant prompt-library categories, surfaced
// inline under each generated phase's checklist (build-phase-panel.tsx
// and the /script route) rather than as a second persistent nav zone
// competing with the checklist for attention. `setup` maps to nothing —
// it already gets the tool's own setupPreamble prepended inline
// (ai-coding-tools.ts), so there's nothing else to point at here. Every
// other PromptCategory value is covered by exactly one phase below.
export const BUILD_PHASE_PROMPT_CATEGORIES: Record<BuildPhaseId, PromptCategory[]> = {
  setup: [],
  design_system: ["design"],
  homepage: ["copy", "content"],
  remaining_pages: ["copy", "content"],
  responsive: ["responsive"],
  seo: ["seo"],
  accessibility: ["accessibility"],
  qa: ["qa", "security"],
  polish: ["performance", "conversion"],
  deployment: ["launch", "analytics"],
};
