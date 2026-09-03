"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TaskStatusBadge } from "@/components/status-badges";
import { createProjectTask, updateProjectTaskStatus } from "@/app/studio/(authed)/projects/actions";

type Task = {
  id: string;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  status: string;
  request_id: string | null;
};
type RequestSummary = { id: string; raw_text: string };

const CONTEXT_PREVIEW_CHARS = 80;

// Projects Kanban Command Centre, Phase A — reuses requests-panel.tsx's
// TaskRow status-button trio shape, but replaces its "assign to project"
// <select> (redundant here — already scoped to this project) with, when
// the task has a request_id, a quoted context line pointing back at the
// request it came from.
function TaskRow({ task, request }: { task: Task; request?: RequestSummary }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(task.status);

  function setTaskStatus(next: "todo" | "in_progress" | "done") {
    setStatus(next);
    startTransition(async () => {
      const r = await updateProjectTaskStatus(task.id, next);
      if (r && "error" in r) setStatus(task.status);
    });
  }

  const preview = request
    ? request.raw_text.length > CONTEXT_PREVIEW_CHARS
      ? `${request.raw_text.slice(0, CONTEXT_PREVIEW_CHARS)}…`
      : request.raw_text
    : null;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{task.title}</p>
        <TaskStatusBadge status={status} />
      </div>
      {task.description && <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>}
      {task.acceptance_criteria && (
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Done means:</span> {task.acceptance_criteria}
        </p>
      )}
      {preview && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          From: &ldquo;{preview}&rdquo; —{" "}
          <Link href="/studio/requests" className="text-accent underline underline-offset-2">
            view request
          </Link>
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {(["todo", "in_progress", "done"] as const).map((s) => (
          <Button key={s} size="xs" variant={status === s ? "secondary" : "ghost"} disabled={pending} onClick={() => setTaskStatus(s)}>
            {s === "todo" ? "To do" : s === "in_progress" ? "In progress" : "Done"}
          </Button>
        ))}
      </div>
    </div>
  );
}

// "Add a task directly to this project" — same dashed-border
// expand-in-place shape as the existing NewProjectForm.
function NewTaskForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" /> Add a task
      </Button>
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await createProjectTask(projectId, title, description || null);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to create the task.");
        return;
      }
      setTitle("");
      setDescription("");
      setOpen(false);
    });
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-3">
      <Label htmlFor="new-task-title" className="text-xs">
        Task title
      </Label>
      <Input
        id="new-task-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-8 text-sm"
        placeholder="Draft homepage copy"
        autoFocus
      />
      <Label htmlFor="new-task-description" className="mt-2 block text-xs">
        Description (optional)
      </Label>
      <Textarea id="new-task-description" value={description} onChange={(e) => setDescription(e.target.value)} className="text-sm" rows={2} />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" disabled={pending || !title.trim()} onClick={submit}>
          {pending ? "Adding…" : "Add task"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ProjectTaskList({
  projectId,
  tasks,
  requestsById,
}: {
  projectId: string;
  tasks: Task[];
  requestsById: Map<string, RequestSummary>;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold">Tasks</h2>
        <NewTaskForm projectId={projectId} />
      </div>
      {tasks.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No tasks yet.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} request={t.request_id ? requestsById.get(t.request_id) : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
