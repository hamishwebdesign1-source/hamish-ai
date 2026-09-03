"use client";

import { useMemo, useState, useTransition, useOptimistic, startTransition as startGlobalTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Plus, Search, SquareCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject, updateProjectStage } from "@/app/studio/(authed)/projects/actions";
import { StudioPageHeader } from "@/components/platform/studio-page-header";
import { ProjectKanbanBoard } from "@/components/platform/project-kanban-board";
import { ProjectStageAccordion } from "@/components/platform/project-stage-accordion";
import { ProjectStageSelect } from "@/components/platform/project-stage-select";
import { PROJECT_STAGES, type ProjectStage } from "@/lib/project-stages";
import type { KanbanProject, TeamMember } from "@/components/platform/project-kanban-card";

type Client = { id: string; business_name: string };
type Project = {
  id: string;
  client_id: string;
  name: string;
  target_date: string | null;
  status: string;
  stage: string;
  created_at: string;
  assigned_to: string | null;
};
type Task = { id: string; project_id: string | null; status: string };

const selectClasses =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function NewProjectForm({ clients }: { clients: Client[] }) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
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
    if (!clientId) {
      setError("Pick a client.");
      return;
    }
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
    <div className="w-full rounded-lg border border-dashed border-border p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_160px]">
        <div>
          <Label htmlFor="new-project-client" className="text-xs">
            Client
          </Label>
          <select id="new-project-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className={`${selectClasses} h-8 w-full`}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="new-project-name" className="text-xs">
            Project name
          </Label>
          <Input
            id="new-project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-sm"
            placeholder="Website redesign"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="new-project-date" className="text-xs">
            Target date (optional)
          </Label>
          <Input id="new-project-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="h-8 text-sm" />
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

  // Projects Kanban Command Centre, Phase A — one useOptimistic at the
  // board root (DESIGN-SYSTEM.md's Kanban board pattern), patching the
  // moved project's stage (and its derived status, so the "Show
  // completed" toggle and every status-reading helper below stay
  // correct against the optimistic guess too). Shared by the desktop
  // drag-and-drop board and the mobile accordion's <select> — both call
  // the same moveProject() below, not two independent mechanisms.
  const [optimisticProjects, setOptimisticProjects] = useOptimistic(
    projects,
    (state: Project[], patch: { id: string; stage: ProjectStage }) =>
      state.map((p) => (p.id === patch.id ? { ...p, stage: patch.stage, status: patch.stage === "completed" ? "done" : "active" } : p))
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rollbackMap, setRollbackMap] = useState<Record<string, string>>({});

  function moveProject(id: string, stage: ProjectStage) {
    const project = optimisticProjects.find((p) => p.id === id);
    if (!project || project.stage === stage) return;
    setPendingId(id);
    startGlobalTransition(async () => {
      setOptimisticProjects({ id, stage });
      const r = await updateProjectStage(id, stage);
      setPendingId(null);
      if (r && "error" in r) {
        const message = r.error ?? "Couldn't move — try again.";
        setRollbackMap((prev) => ({ ...prev, [id]: message }));
        setTimeout(() => {
          setRollbackMap((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }, 1500);
      }
    });
  }

  const clientNameById = useMemo(() => new Map(clients.map((c) => [c.id, c.business_name])), [clients]);

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

  // Studio big-ticket ("team collaboration") — only meaningful once
  // there's more than one person on the org, same gate as every other
  // assignee control in this app.
  const [mineOnly, setMineOnly] = useState(false);
  // Phase A's "Show completed" toggle replaces the old flat list's
  // active/all filter — Kanban already segregates done work into its own
  // column, so this stays opt-in by default to avoid a long-lived
  // agency's Completed column dominating the first screen.
  const [showCompleted, setShowCompleted] = useState(false);
  const [search, setSearch] = useState("");

  const visibleStages = useMemo(() => (showCompleted ? PROJECT_STAGES : PROJECT_STAGES.filter((s) => s.id !== "completed")), [showCompleted]);

  const kanbanProjects: KanbanProject[] = useMemo(
    () =>
      optimisticProjects.map((p) => ({
        id: p.id,
        name: p.name,
        clientName: clientNameById.get(p.client_id) ?? "Unknown client",
        stage: p.stage,
        status: p.status,
        target_date: p.target_date,
        assigned_to: p.assigned_to,
      })),
    [optimisticProjects, clientNameById]
  );

  const searchLower = search.trim().toLowerCase();
  const filteredProjects = useMemo(
    () =>
      kanbanProjects.filter((p) => {
        if (mineOnly && p.assigned_to !== currentUserEmail) return false;
        if (searchLower && !p.clientName.toLowerCase().includes(searchLower)) return false;
        return true;
      }),
    [kanbanProjects, mineOnly, currentUserEmail, searchLower]
  );

  const projectsByStage = useMemo(() => {
    const map = new Map<string, KanbanProject[]>();
    for (const stage of PROJECT_STAGES) map.set(stage.id, []);
    for (const p of filteredProjects) {
      const list = map.get(p.stage) ?? [];
      list.push(p);
      map.set(p.stage, list);
    }
    return map;
  }, [filteredProjects]);

  // Projects Kanban Command Centre, Phase A — bulk actions generalised
  // from "mark N done" to "move N to any stage," same
  // Promise.all/"N of M failed" shape as the old bulkMarkDone.
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<ProjectStage>("completed");
  const [bulkPending, startBulk] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkDone, setBulkDone] = useState<number | null>(null);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelected(new Set());
  }

  function bulkMove() {
    const ids = Array.from(selected);
    if (ids.length === 0 || bulkPending) return;
    setBulkError(null);
    setBulkDone(null);
    startBulk(async () => {
      const results = await Promise.all(ids.map((id) => updateProjectStage(id, bulkStage)));
      const failed = results.filter((r) => r && "error" in r).length;
      setSelected(new Set());
      if (failed > 0) setBulkError(`${failed} of ${ids.length} failed to update — try again for those.`);
      setBulkDone(ids.length - failed);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <StudioPageHeader
        eyebrow="Deliver"
        title="Projects"
        description={
          <>
            What you&apos;re delivering and by when, per client. Drag a card between stages, or assign a task to a
            project from the{" "}
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
            <Button size="sm" variant={showCompleted ? "secondary" : "ghost"} onClick={() => setShowCompleted((v) => !v)}>
              Show completed
            </Button>
            {teamMembers.length > 1 && (
              <Button size="sm" variant={mineOnly ? "secondary" : "ghost"} onClick={() => setMineOnly((v) => !v)}>
                Assigned to me
              </Button>
            )}
            <Button
              size="sm"
              variant={selectMode ? "secondary" : "ghost"}
              aria-pressed={selectMode}
              aria-label="Select projects"
              onClick={toggleSelectMode}
            >
              <SquareCheck className="size-3.5" /> Select
            </Button>
            {clients.length > 4 && (
              <div className="relative ml-auto w-full max-w-56">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by client…" className="h-9 pl-8 text-sm" />
              </div>
            )}
            <div className="w-full sm:w-auto sm:ml-auto">
              <NewProjectForm clients={clients} />
            </div>
          </div>

          {selectMode && selected.size > 0 && (
            <div className="fixed inset-x-4 bottom-4 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 shadow-lg sm:static sm:inset-auto sm:bottom-auto sm:shadow-none">
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              <ProjectStageSelect stage={bulkStage} onChange={(next) => setBulkStage(next as ProjectStage)} label="Move selected projects to…" />
              <Button size="xs" variant="outline" disabled={bulkPending} onClick={bulkMove}>
                {bulkPending ? "Moving…" : `Move ${selected.size}`}
              </Button>
              <Button size="icon-xs" variant="ghost" aria-label="Clear selection" onClick={() => setSelected(new Set())}>
                <X className="size-3" />
              </Button>
            </div>
          )}
          {bulkDone !== null && !bulkPending && (
            <p className="text-xs text-accent">
              {bulkDone} project{bulkDone === 1 ? "" : "s"} moved.
            </p>
          )}
          {bulkError && <p className="text-xs text-destructive">{bulkError}</p>}

          {filteredProjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No projects match the current filters.
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <ProjectKanbanBoard
                  stages={visibleStages}
                  projectsByStage={projectsByStage}
                  tasksByProject={tasksByProject}
                  teamMembers={teamMembers}
                  selectMode={selectMode}
                  selected={selected}
                  onToggleSelect={toggleSelected}
                  pendingId={pendingId}
                  rollbackMap={rollbackMap}
                  onMove={moveProject}
                />
              </div>
              <ProjectStageAccordion
                stages={visibleStages}
                projectsByStage={projectsByStage}
                tasksByProject={tasksByProject}
                teamMembers={teamMembers}
                selectMode={selectMode}
                selected={selected}
                onToggleSelect={toggleSelected}
                pendingId={pendingId}
                rollbackMap={rollbackMap}
                onMove={moveProject}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
