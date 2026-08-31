"use client";

import { useMemo, useState, useTransition } from "react";
import { FolderKanban, Plus, CalendarDays, CircleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject, updateProjectStatus } from "@/app/studio/(authed)/projects/actions";

type Client = { id: string; business_name: string };
type Project = { id: string; client_id: string; name: string; target_date: string | null; status: string; created_at: string };
type Task = { id: string; project_id: string | null; status: string };

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

function ProjectCard({ project, tasks }: { project: Project; tasks: Task[] }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(project.status);

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

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center justify-between gap-3">
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
          <div className="flex shrink-0 items-center gap-2">
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

function ClientProjectsGroup({ client, projects, tasksByProject }: { client: Client; projects: Project[]; tasksByProject: Map<string, Task[]> }) {
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
            <ProjectCard key={p.id} project={p} tasks={tasksByProject.get(p.id) ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectsPanel({ clients, projects, tasks }: { clients: Client[]; projects: Project[]; tasks: Task[] }) {
  const [filter, setFilter] = useState<"active" | "all">("active");

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
    const visible = filter === "active" ? projects.filter((p) => p.status !== "done") : projects;
    for (const p of visible) {
      const list = map.get(p.client_id) ?? [];
      list.push(p);
      map.set(p.client_id, list);
    }
    return map;
  }, [projects, filter]);

  const clientsWithActivity = clients.filter((c) => (projectsByClient.get(c.id) ?? []).length > 0 || filter === "all");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold md:text-3xl">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What you&apos;re delivering and by when, per client. A thin wrapper around your existing tasks — assign a
          task to a project from the{" "}
          <a href="/studio/requests" className="text-accent underline underline-offset-2">
            Requests
          </a>{" "}
          page.
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <FolderKanban className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No clients yet — convert a prospect first, then come back here to track their delivery.
          </p>
        </div>
      ) : (
        <>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className={selectClasses}
            aria-label="Filter projects"
          >
            <option value="active">Active projects</option>
            <option value="all">All clients, all projects</option>
          </select>

          <div className="space-y-6">
            {clientsWithActivity.map((c) => (
              <ClientProjectsGroup key={c.id} client={c} projects={projectsByClient.get(c.id) ?? []} tasksByProject={tasksByProject} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
