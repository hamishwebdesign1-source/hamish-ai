"use client";

import { assignProject } from "@/app/studio/(authed)/projects/actions";
import { AssigneeSelect, type AssigneeSelectTeamMember } from "@/components/platform/assignee-select";

// Projects Kanban Command Centre, Phase A — the detail page's own
// assignee control, same shape as WebsiteProjectAssigneeControl
// (website-builder), calling the existing assignProject() Server Action
// (unchanged) rather than a new one. Now a thin wrapper around the
// shared AssigneeSelect (BACKLOG.md "Consolidate the 4 duplicated
// assignee-select components").
export function ProjectAssigneeControl({
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
      onAssign={(next) => assignProject(projectId, next)}
      teamMembers={teamMembers}
      ariaLabel="Assign this project"
      label="Assigned to"
    />
  );
}
