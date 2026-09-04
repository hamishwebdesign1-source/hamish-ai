import { History, User, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/time-ago";
import { getProjectStageMeta } from "@/lib/project-stages";

// Projects Kanban Command Centre, Phase A — a scoped read of audit_log
// (target_type = 'project' AND target_id = this project), rendered as a
// compact list matching /admin/activity-log's row shape (action label +
// actor badge + relative time) but in Studio's own card/badge styling
// (bg-card rows, not the admin page's flat list) — no search bar, this
// is already scoped to one project. Plain server component, no client
// state.

type ActivityEntry = {
  id: string;
  created_at: string;
  actor: string;
  actor_type: string;
  action: string;
  metadata: Record<string, unknown> | null;
};

const ACTION_LABEL: Record<string, string> = {
  "project.created": "Project created",
  "project.assigned": "Assigned",
  "project.unassigned": "Unassigned",
  "project.stage_changed": "Stage changed",
  "project.deleted": "Project deleted",
  // Projects Kanban Command Centre, Phase C1 -- "Agency completes
  // Deliverable" onward, in Hamish's own delivery-chain wording, showing
  // up as a real timeline entry for free since this trail is already
  // rendered on this exact page.
  "deliverable.submitted": "Deliverable submitted",
  "deliverable.deleted": "Deliverable removed",
  // "Add a delete-task control" (BACKLOG.md) -- same free-timeline-entry
  // reasoning as the deliverable actions above.
  "task.deleted": "Task removed",
};

const actorTypeVariant: Record<string, "secondary" | "outline" | "warning"> = {
  admin: "secondary",
  client: "outline",
  system: "warning",
};

function describeEntry(entry: ActivityEntry): string {
  const m = entry.metadata ?? {};
  switch (entry.action) {
    case "project.assigned":
      return typeof m.assignedTo === "string" ? m.assignedTo : "";
    // Same shape as client.status_changed's own metadata convention
    // (from -> to), rendered here in real stage labels rather than raw
    // enum values.
    case "project.stage_changed": {
      const from = typeof m.from === "string" ? getProjectStageMeta(m.from).label : "—";
      const to = typeof m.to === "string" ? getProjectStageMeta(m.to).label : "—";
      return `${from} → ${to}`;
    }
    case "deliverable.submitted":
    case "deliverable.deleted":
    case "task.deleted":
      return typeof m.title === "string" ? m.title : "";
    default:
      return "";
  }
}

export function ProjectActivityTrail({ entries }: { entries: ActivityEntry[] }) {
  return (
    <div>
      <h2 className="font-heading text-base font-semibold">Activity</h2>
      {entries.length === 0 ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <History className="size-3.5" /> Nothing logged yet.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {entries.map((entry) => {
            const detail = describeEntry(entry);
            return (
              <li key={entry.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-medium">{ACTION_LABEL[entry.action] ?? entry.action}</p>
                    <Badge variant={actorTypeVariant[entry.actor_type] ?? "secondary"} className="gap-1">
                      {entry.actor_type === "admin" ? <User className="size-3" /> : <Server className="size-3" />}
                      {entry.actor}
                    </Badge>
                  </div>
                  {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(entry.created_at)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
