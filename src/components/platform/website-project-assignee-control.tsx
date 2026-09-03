"use client";

import { useState, useTransition } from "react";
import { assignWebsiteProject } from "@/app/studio/(authed)/website-builder/actions";

// Studio big-ticket ("team collaboration") — the one project-like
// workflow left out of assignment when requests/prospects/projects got
// it (requests-panel.tsx/prospecting-panel.tsx/projects-panel.tsx's own
// assignee <select>s). Same selectClasses chrome, own small file since
// this page has no existing panel component with a natural home for it.
const selectClasses =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type TeamMember = { email: string; role: "owner" | "member" };

export function WebsiteProjectAssigneeControl({
  projectId,
  initialAssignedTo,
  teamMembers,
}: {
  projectId: string;
  initialAssignedTo: string | null;
  teamMembers: TeamMember[];
}) {
  const [assignee, setAssignee] = useState(initialAssignedTo ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Only meaningful once there's more than one person to hand this to —
  // same gate every other assignee select in this app uses.
  if (teamMembers.length <= 1) return null;

  function setProjectAssignee(next: string) {
    const prev = assignee;
    setError(null);
    setAssignee(next);
    startTransition(async () => {
      const r = await assignWebsiteProject(projectId, next || null);
      if (r && "error" in r) {
        setAssignee(prev);
        setError(r.error ?? "Failed to update — try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Assigned to
        <select
          value={assignee}
          onChange={(e) => setProjectAssignee(e.target.value)}
          disabled={pending}
          aria-label="Assign this website project"
          className={selectClasses}
        >
          <option value="">Unassigned</option>
          {teamMembers.map((m) => (
            <option key={m.email} value={m.email}>
              {m.email}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
