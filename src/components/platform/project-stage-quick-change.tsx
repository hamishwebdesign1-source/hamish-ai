"use client";

import { useState, useTransition } from "react";
import { updateProjectStage } from "@/app/studio/(authed)/projects/actions";
import { ProjectStageSelect } from "@/components/platform/project-stage-select";

// Projects Kanban Command Centre, Phase A — the detail page's own
// quick-change control (header actions row): a compact stage <select>
// for changing stage without opening the board, and the only way to
// change stage on mobile besides the board's own per-card select. Same
// hand-rolled optimistic-update-then-revert shape as
// WebsiteProjectAssigneeControl/ProjectAssigneeControl — a standalone
// page has no shared board-level useOptimistic to plug into.
export function ProjectStageQuickChange({ projectId, initialStage }: { projectId: string; initialStage: string }) {
  const [stage, setStage] = useState(initialStage);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(next: string) {
    const prev = stage;
    setError(null);
    setStage(next);
    startTransition(async () => {
      const r = await updateProjectStage(projectId, next);
      if (r && "error" in r) {
        setStage(prev);
        setError(r.error ?? "Failed to update — try again.");
      }
    });
  }

  return <ProjectStageSelect stage={stage} onChange={change} disabled={pending} error={error} />;
}
