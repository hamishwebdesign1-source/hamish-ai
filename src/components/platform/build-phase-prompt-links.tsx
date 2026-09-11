import Link from "next/link";
import { Sparkles } from "lucide-react";
import { BUILD_PHASE_PROMPT_CATEGORIES } from "@/lib/build-phase-prompt-mapping";
import { PROMPT_CATEGORY_LABELS } from "@/lib/website-prompt-library";
import type { BuildPhaseId } from "@/lib/website-build-phases";

// Website Builder build-phase flow (BACKLOG.md, 2026-09-11), point 6 —
// a small per-phase link row into the relevant prompt-library
// categories, same visual weight as the existing "Browse the prompt
// library for this project" link on the project page. Shared between
// build-phase-panel.tsx (each generated phase's card) and the /script
// route's per-phase accordion item, rather than two copies of the same
// mapping-to-links logic. Renders nothing when the phase has no mapped
// categories (only `setup`, which already gets the tool's own
// setupPreamble inline).
export function BuildPhasePromptLinks({ projectId, phaseId }: { projectId: string; phaseId: BuildPhaseId }) {
  const categories = BUILD_PHASE_PROMPT_CATEGORIES[phaseId];
  if (categories.length === 0) return null;

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
      <Sparkles className="size-3.5 shrink-0" />
      <span>Need to refine this later?</span>
      {categories.map((category) => (
        <Link
          key={category}
          href={`/studio/website-builder/prompts?project=${projectId}&category=${category}`}
          className="underline-offset-2 hover:text-accent hover:underline"
        >
          {PROMPT_CATEGORY_LABELS[category]} prompts
        </Link>
      ))}
    </p>
  );
}
