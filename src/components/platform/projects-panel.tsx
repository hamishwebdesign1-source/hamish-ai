"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Plus, CalendarDays, CircleAlert, Search, Trash2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject, updateProjectStatus, assignProject, deleteProject } from "@/app/studio/(authed)/projects/actions";
import { StudioPageHeader } from "@/components/platform/studio-page-header";

type Client = { id: string; business_name: string };
type Project = { id: string; client_id: string; name: string; target_date: string | null; status: string; created_at: string; assigned_to: string | null };
type Task = { id: string; project_id: string | null; status: string };
type TeamMember = { email: string; role: "owner" | "member" };

const selectClasses =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(targetDate: string | null, status: string) {
  if (!targetDate || status === "done") return false;
  return new Date(targetDate) < new Date(new Date().toDateString());
}

// Studio improvement — the overdue/not-overdue split was binary, so a
// project due tomorrow read identically to one due in 6 months until the
// exact day it flipped red. DUE_SOON_DAYS gives a project manager an
// actual heads-up window, same "warning tier before critical" shape as
// studio-engagement.ts's own tierFor() (quiet-but-not-yet-critical gets
// its own state rather than jumping straight from fine to alarming).
const DUE_SOON_DAYS = 5;

function daysUntil(targetDate: string): number {
  const today = new Date(new Date().toDateString());
  const target = new Date(targetDate);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function isDueSoon(targetDate: string | null, status: string): boolean {
  if (!targetDate || status === "done") return false;
  const days = daysUntil(targetDate);
  return days >= 0 && days <= DUE_SOON_DAYS;
}

// The day-count line next to the date — "overdue" used to be the only
// state that said anything beyond the raw date; this gives every state
// (including plain "active", once it's still comfortably in the future)
// a real, honest count rather than leaving the reader to do the maths.
function dueDateNote(targetDate: string): string {
  const days = daysUntil(targetDate);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "due today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}

function ProjectCard({
  project,
  tasks,
  selected,
  onToggleSelect,
  teamMembers,
}: {
  project: Project;
  tasks: Task[];
  selected?: boolean;
  onToggleSelect?: () => void;
  teamMembers: TeamMember[];
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(project.status);
  const [assignee, setAssignee] = useState(project.assigned_to ?? "");
  const [assignPending, startAssign] = useTransition();
  // Studio big-ticket ("no delete for projects/website-builder
  // projects") — same confirm-then-delete shape as campaigns-panel.tsx's
  // own CampaignCard.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleted, setDeleted] = useState(false);

  function remove() {
    startDeleteTransition(async () => {
      const r = await deleteProject(project.id);
      if (r && "error" in r) {
        setConfirmingDelete(false);
        return;
      }
      setDeleted(true);
    });
  }

  function setProjectAssignee(next: string) {
    const prev = assignee;
    setAssignee(next);
    startAssign(async () => {
      const r = await assignProject(project.id, next || null);
      if (r && "error" in r) setAssignee(prev);
    });
  }

  const done = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : null;
  const overdue = isOverdue(project.target_date, status);
  const dueSoon = isDueSoon(project.target_date, status);

  function toggleDone() {
    const next = status === "done" ? "active" : "done";
    setStatus(next);
    startTransition(async () => {
      const r = await updateProjectStatus(project.id, next);
      if (r && "error" in r) setStatus(project.status);
    });
  }

  // revalidatePath re-fetches server data but doesn't unmount an already-
  // rendered client card mid-transition — hide it immediately on success
  // rather than leaving a just-deleted project visible until the next
  // full navigation (same reasoning campaigns-panel.tsx's own
  // CampaignCard documents).
  if (deleted) return null;

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* Studio improvement — bulk actions. Only rendered for a
                still-active project, matching exactly when "Mark done"
                itself is offered below. */}
            {status !== "done" && onToggleSelect && (
              <input
                type="checkbox"
                checked={selected ?? false}
                onChange={onToggleSelect}
                aria-label={`Select ${project.name}`}
                className="size-4 shrink-0 rounded border-border accent-accent"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{project.name}</p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                {project.target_date && (
                  <span className={`flex items-center gap-1 ${overdue ? "text-destructive" : dueSoon ? "text-warning" : ""}`}>
                    <CalendarDays className="size-3" /> {formatDate(project.target_date)}
                    {status !== "done" && ` · ${dueDateNote(project.target_date)}`}
                  </span>
                )}
                {tasks.length > 0 && <span>{done}/{tasks.length} tasks done</span>}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Studio big-ticket ("team collaboration") — same gate as
                prospecting-panel.tsx/requests-panel.tsx's own assignee
                selects: only meaningful once there's more than one
                person to hand this to. No sibling-of-a-button concern
                here, unlike those two — this card's header is a plain
                div, not a click-to-expand button. */}
            {teamMembers.length > 1 && (
              <select
                value={assignee}
                onChange={(e) => setProjectAssignee(e.target.value)}
                disabled={assignPending}
                aria-label={`Assign ${project.name}`}
                className={selectClasses}
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.email} value={m.email}>
                    {m.email}
                  </option>
                ))}
              </select>
            )}
            {status === "done" ? (
              <Badge variant="success">Done</Badge>
            ) : overdue ? (
              <Badge variant="destructive" className="gap-1">
                <CircleAlert className="size-3" /> Overdue
              </Badge>
            ) : dueSoon ? (
              <Badge variant="warning" className="gap-1">
                <CircleAlert className="size-3" /> Due soon
              </Badge>
            ) : (
              <Badge variant="accent">Active</Badge>
            )}
            <Button size="xs" variant="ghost" disabled={pending} onClick={toggleDone}>
              {status === "done" ? "Reopen" : "Mark done"}
            </Button>
            {confirmingDelete ? (
              <>
                <Button size="xs" variant="destructive" disabled={deletePending} onClick={remove}>
                  {deletePending ? "…" : "Confirm"}
                </Button>
                <Button size="icon-xs" variant="ghost" aria-label="Cancel delete" onClick={() => setConfirmingDelete(false)}>
                  <X className="size-3" />
                </Button>
              </>
            ) : (
              <Button size="icon-xs" variant="ghost" aria-label="Delete project" onClick={() => setConfirmingDelete(true)}>
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
        </div>
        {pct !== null && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NewProjectForm({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" /> New project
      </Button>
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await createProject(clientId, name, targetDate || null);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to create the project.");
        return;
      }
      setName("");
      setTargetDate("");
      setOpen(false);
    });
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
        <div>
          <Label htmlFor={`project-name-${clientId}`} className="text-xs">
            Project name
          </Label>
          <Input
            id={`project-name-${clientId}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-sm"
            placeholder="Website redesign"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor={`project-date-${clientId}`} className="text-xs">
            Target date (optional)
          </Label>
          <Input
            id={`project-date-${clientId}`}
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" disabled={pending || !name.trim()} onClick={submit}>
          {pending ? "Creating…" : "Create project"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ClientProjectsGroup({
  client,
  projects,
  tasksByProject,
  selected,
  onToggleSelect,
  teamMembers,
}: {
  client: Client;
  projects: Project[];
  tasksByProject: Map<string, Task[]>;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  teamMembers: TeamMember[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold">{client.business_name}</h2>
        <NewProjectForm clientId={client.id} />
      </div>
      {projects.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No projects yet for this client.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              tasks={tasksByProject.get(p.id) ?? []}
              selected={selected.has(p.id)}
              onToggleSelect={() => onToggleSelect(p.id)}
              teamMembers={teamMembers}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectsPanel({
  clients,
  projects,
  tasks,
  teamMembers,
  currentUserEmail,
}: {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  teamMembers: TeamMember[];
  currentUserEmail: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"active" | "all">("active");
  // Studio big-ticket ("team collaboration") — only meaningful once
  // there's more than one person on the org, same gate as the assignee
  // select itself.
  const [mineOnly, setMineOnly] = useState(false);

  const tasksByProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.project_id) continue;
      const list = map.get(t.project_id) ?? [];
      list.push(t);
      map.set(t.project_id, list);
    }
    return map;
  }, [tasks]);

  const projectsByClient = useMemo(() => {
    const map = new Map<string, Project[]>();
    let visible = filter === "active" ? projects.filter((p) => p.status !== "done") : projects;
    if (mineOnly) visible = visible.filter((p) => p.assigned_to === currentUserEmail);
    for (const p of visible) {
      const list = map.get(p.client_id) ?? [];
      list.push(p);
      map.set(p.client_id, list);
    }
    return map;
  }, [projects, filter, mineOnly, currentUserEmail]);

  // Studio improvement — same client-side search pattern as
  // clients-panel.tsx/requests-panel.tsx. Filters by client name (this
  // page is grouped by client, not a flat project list), on top of the
  // existing active/all filter above.
  const [search, setSearch] = useState("");
  const searchLower = search.trim().toLowerCase();
  const clientsWithActivity = clients.filter(
    (c) =>
      ((projectsByClient.get(c.id) ?? []).length > 0 || filter === "all") &&
      (!searchLower || c.business_name.toLowerCase().includes(searchLower))
  );

  // Studio improvement — bulk actions, same pattern as prospecting-panel.tsx's
  // own bulk "mark as contacted"/requests-panel.tsx's bulk "mark as
  // responded". Selectable set is every still-active project across
  // every currently-visible client group (search + active/all filter
  // both already applied via clientsWithActivity/projectsByClient).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPending, startBulk] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkDone, setBulkDone] = useState<number | null>(null);

  const selectableProjects = clientsWithActivity.flatMap((c) => (projectsByClient.get(c.id) ?? []).filter((p) => p.status !== "done"));
  const allVisibleSelected = selectableProjects.length > 0 && selectableProjects.every((p) => selected.has(p.id));

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const p of selectableProjects) next.delete(p.id);
      } else {
        for (const p of selectableProjects) next.add(p.id);
      }
      return next;
    });
  }

  function bulkMarkDone() {
    const ids = Array.from(selected);
    if (ids.length === 0 || bulkPending) return;
    setBulkError(null);
    setBulkDone(null);
    startBulk(async () => {
      const results = await Promise.all(ids.map((id) => updateProjectStatus(id, "done")));
      const failed = results.filter((r) => r && "error" in r).length;
      setSelected(new Set());
      if (failed > 0) setBulkError(`${failed} of ${ids.length} failed to update — try again for those.`);
      setBulkDone(ids.length - failed);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <StudioPageHeader
        eyebrow="Deliver"
        title="Projects"
        description={
          <>
            What you&apos;re delivering and by when, per client. A thin wrapper around your existing tasks — assign
            a task to a project from the{" "}
            <a href="/studio/requests" className="text-accent underline underline-offset-2">
              Requests
            </a>{" "}
            page.
          </>
        }
      />

      {clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <FolderKanban className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No clients yet — convert a prospect first, then come back here to track their delivery.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className={selectClasses}
              aria-label="Filter projects"
            >
              <option value="active">Active projects</option>
              <option value="all">All clients, all projects</option>
            </select>
            {teamMembers.length > 1 && (
              <Button size="sm" variant={mineOnly ? "secondary" : "ghost"} onClick={() => setMineOnly((v) => !v)}>
                Assigned to me
              </Button>
            )}
            {clients.length > 4 && (
              <div className="relative ml-auto w-full max-w-56">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by client…" className="h-9 pl-8 text-sm" />
              </div>
            )}
          </div>

          {clientsWithActivity.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No clients match that search.
            </div>
          ) : (
            <>
              {selectableProjects.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all visible active projects"
                    className="size-4 shrink-0 rounded border-border accent-accent"
                  />
                  <span>Select all {selectableProjects.length} active</span>
                  {selected.size > 0 && (
                    <span className="ml-auto flex items-center gap-2">
                      <span>{selected.size} selected</span>
                      <Button size="xs" variant="outline" disabled={bulkPending} onClick={bulkMarkDone}>
                        {bulkPending ? "Updating…" : `Mark ${selected.size} done`}
                      </Button>
                    </span>
                  )}
                </div>
              )}
              {bulkDone !== null && !bulkPending && (
                <p className="text-xs text-accent">
                  {bulkDone} project{bulkDone === 1 ? "" : "s"} marked done.
                </p>
              )}
              {bulkError && <p className="text-xs text-destructive">{bulkError}</p>}
              <div className="space-y-6">
                {clientsWithActivity.map((c) => (
                  <ClientProjectsGroup
                    key={c.id}
                    client={c}
                    projects={projectsByClient.get(c.id) ?? []}
                    tasksByProject={tasksByProject}
                    selected={selected}
                    onToggleSelect={toggleSelected}
                    teamMembers={teamMembers}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
