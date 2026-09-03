import { CheckCircle2, Circle, CircleDot } from "lucide-react";

// Projects Kanban Command Centre, Phase A — generalised from a
// hardcoded website_projects-only tracker to accept a `stages` prop, per
// DECISIONS.md's matching 2026-09-03 entry: one reusable tracker
// component, two real stage lists (website-builder/[id]/page.tsx's own
// 6-stage pipeline, and the new /studio/projects/[id]'s 5-stage
// PROJECT_STAGES from project-stages.ts), not a duplicated visual
// pattern.
export function ProjectStageTracker({ stage, stages }: { stage: string; stages: { id: string; label: string }[] }) {
  const currentIndex = stages.findIndex((s) => s.id === stage);

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {stages.map((s, index) => {
        const done = currentIndex >= 0 && index < currentIndex;
        const active = index === currentIndex;
        return (
          <div key={s.id} className="flex items-center gap-1">
            {index > 0 && <span className="mx-1 h-px w-4 bg-border" />}
            <span className={`flex items-center gap-1 text-xs font-medium ${done || active ? "text-foreground" : "text-muted-foreground"}`}>
              {done ? (
                <CheckCircle2 className="size-3.5 shrink-0 text-accent" />
              ) : active ? (
                <CircleDot className="size-3.5 shrink-0 text-accent" />
              ) : (
                <Circle className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
