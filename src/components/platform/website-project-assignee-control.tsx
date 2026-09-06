"use client";

import { assignWebsiteProject } from "@/app/studio/(authed)/website-builder/actions";
import { AssigneeSelect, type AssigneeSelectTeamMember } from "@/components/platform/assignee-select";

// Studio big-ticket ("team collaboration") — the one project-like
// workflow left out of assignment when requests/prospects/projects got
// it (requests-panel.tsx/prospecting-panel.tsx/projects-panel.tsx's own
// assignee <select>s). Now a thin wrapper around the shared
// AssigneeSelect (BACKLOG.md "Consolidate the 4 duplicated
// assignee-select components").
export function WebsiteProjectAssigneeControl({
  projectId,
  initialAssignedTo,
  teamMembers,
}: {
  projectId: string;
  initialAssignedTo: string | null;
  teamMembers: AssigneeSelectTeamMember[];
}) {
  return (
    <AssigneeSelect
      value={initialAssignedTo}
      onAssign={(next) => assignWebsiteProject(projectId, next)}
      teamMembers={teamMembers}
      ariaLabel="Assign this website project"
      label="Assigned to"
    />
  );
}
