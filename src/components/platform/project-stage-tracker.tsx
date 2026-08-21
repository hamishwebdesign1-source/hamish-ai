import { CheckCircle2, Circle, CircleDot } from "lucide-react";

// AI Website Creation Guide, WB3 — §16's "where the client/agency is"
// tracker, kept to the same 6 real stages the rest of the pipeline
// already tracks on website_projects.stage — not the brief's own
// illustrative 7-stage example (Discovery/Strategy/Design/Development/
// Testing/Client Review/Launch), since inventing extra stages this
// project doesn't actually distinguish would be a tracker that lies.
const STAGES: { id: string; label: string }[] = [
  { id: "discovery", label: "Discovery" },
  { id: "brief", label: "Brief" },
  { id: "tool", label: "Tool" },
  { id: "build", label: "Build" },
  { id: "qa", label: "QA" },
  { id: "launched", label: "Launch" },
];

export function ProjectStageTracker({ stage }: { stage: string }) {
  const currentIndex = STAGES.findIndex((s) => s.id === stage);

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {STAGES.map((s, index) => {
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
