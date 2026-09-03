"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, LoaderCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, dueDateNote, isOverdue, isDueSoon } from "@/lib/project-dates";

export type TeamMember = { email: string; role: "owner" | "member" };

export type KanbanProject = {
  id: string;
  name: string;
  clientName: string;
  stage: string;
  status: string;
  target_date: string | null;
  assigned_to: string | null;
};

// Two-letter initials from the email's local part — no fallback avatar
// image system, this codebase has no Avatar component and no per-user
// photo data (DESIGN-SYSTEM.md's Kanban card anatomy spec).
function initials(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

// Projects Kanban Command Centre, Phase A — the compact card anatomy
// (DESIGN-SYSTEM.md/BACKLOG.md's Phase 3 Design section, point 3).
// Deliberately presentational only: `handle` (the drag grip, desktop
// board only) and `selectSlot` (the bulk-select checkbox) are passed in
// as slots rather than this component calling dnd-kit hooks itself, so
// the exact same card renders inside the draggable desktop board and the
// non-draggable mobile accordion without duplicating this markup twice.
export function ProjectKanbanCard({
  project,
  taskDone,
  taskTotal,
  teamMembers,
  pending = false,
  rollbackMessage = null,
  handle,
  selectSlot,
}: {
  project: KanbanProject;
  taskDone: number;
  taskTotal: number;
  teamMembers: TeamMember[];
  pending?: boolean;
  rollbackMessage?: string | null;
  handle?: ReactNode;
  selectSlot?: ReactNode;
}) {
  const overdue = isOverdue(project.target_date, project.status);
  const dueSoon = isDueSoon(project.target_date, project.status);
  const pct = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : null;
  const showAssignee = teamMembers.length > 1 && !!project.assigned_to;
  const highlighted = Boolean(rollbackMessage);

  return (
    <div>
      <Card size="sm" className={`relative transition-colors ${highlighted ? "bg-destructive/10" : ""} ${pending ? "opacity-70" : ""}`}>
        <CardContent className="flex items-start gap-2">
          {selectSlot}
          {handle}
          <Link href={`/studio/projects/${project.id}`} className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium">{project.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.clientName}</p>
            {taskTotal > 0 && (
              <>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {taskDone}/{taskTotal} tasks done
                </p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                </div>
              </>
            )}
            <div className="mt-2 flex items-center justify-between gap-2">
              {project.target_date ? (
                <span
                  className={`flex items-center gap-1 text-[11px] ${overdue ? "text-destructive" : dueSoon ? "text-warning" : "text-muted-foreground"}`}
                >
                  <CalendarDays className="size-3" />
                  {formatDate(project.target_date)}
                  {project.status !== "done" && ` · ${dueDateNote(project.target_date)}`}
                </span>
              ) : (
                <span />
              )}
              {showAssignee && (
                <span
                  aria-label={`Assigned to ${project.assigned_to}`}
                  className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground"
                >
                  {initials(project.assigned_to!)}
                </span>
              )}
            </div>
          </Link>
          {pending && <LoaderCircle className="absolute top-2 right-2 size-3 animate-spin text-muted-foreground" />}
        </CardContent>
      </Card>
      {rollbackMessage && <p className="mt-1 text-xs text-destructive">{rollbackMessage}</p>}
    </div>
  );
}
