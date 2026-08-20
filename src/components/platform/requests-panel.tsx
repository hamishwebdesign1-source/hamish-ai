"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Inbox,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  CircleAlert,
  ListTodo,
  Lightbulb,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RequestStatusBadge, TaskStatusBadge, PriorityBadge } from "@/components/status-badges";
import { markRequestResponded, updateRequestDraft, updateTaskStatus } from "@/app/studio/(authed)/requests/actions";
import { assignTaskToProject } from "@/app/studio/(authed)/projects/actions";

type Request = {
  id: string;
  created_at: string;
  client_id: string;
  raw_text: string;
  status: string;
  category: string | null;
  complexity: string | null;
  suggested_approach: string | null;
  covered_by_maintenance: boolean | null;
  coverage_reasoning: string | null;
  draft_response: string | null;
  priority: string | null;
  missing_info: string[] | null;
  responded_at: string | null;
  clients: { business_name: string } | { business_name: string }[] | null;
};

type Task = {
  id: string;
  request_id: string;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  status: string;
  project_id: string | null;
};

type Project = { id: string; client_id: string; name: string; status: string };

const selectClasses =
  "h-7 rounded-lg border border-input bg-transparent px-2 text-[11px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function clientName(r: Request): string {
  const c = Array.isArray(r.clients) ? r.clients[0] : r.clients;
  return c?.business_name ?? "Unknown client";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-accent"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function TaskRow({ task, projects }: { task: Task; projects: Project[] }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(task.status);
  const [projectPending, startProjectTransition] = useTransition();
  const [projectId, setProjectId] = useState(task.project_id ?? "");

  function setTaskStatus(next: "todo" | "in_progress" | "done") {
    setStatus(next);
    startTransition(async () => {
      const r = await updateTaskStatus(task.id, next);
      if (r && "error" in r) setStatus(task.status);
    });
  }

  function setTaskProject(next: string) {
    const prev = projectId;
    setProjectId(next);
    startProjectTransition(async () => {
      const r = await assignTaskToProject(task.id, next || null);
      if (r && "error" in r) setProjectId(prev);
    });
  }

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
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {(["todo", "in_progress", "done"] as const).map((s) => (
          <Button
            key={s}
            size="xs"
            variant={status === s ? "secondary" : "ghost"}
            disabled={pending}
            onClick={() => setTaskStatus(s)}
          >
            {s === "todo" ? "To do" : s === "in_progress" ? "In progress" : "Done"}
          </Button>
        ))}
        {projects.length > 0 && (
          <select
            value={projectId}
            onChange={(e) => setTaskProject(e.target.value)}
            disabled={projectPending}
            className={`${selectClasses} ml-auto`}
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function RequestCard({ request, tasks, projects }: { request: Request; tasks: Task[]; projects: Project[] }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(request.draft_response ?? "");
  const [draftPending, startDraftSave] = useTransition();
  const [draftSaved, setDraftSaved] = useState(false);
  const [respondPending, startRespond] = useTransition();
  const [responded, setResponded] = useState(Boolean(request.responded_at));

  function saveDraft() {
    setDraftSaved(false);
    startDraftSave(async () => {
      const r = await updateRequestDraft(request.id, draft);
      if (!("error" in r)) setDraftSaved(true);
    });
  }

  function markResponded() {
    startRespond(async () => {
      const r = await markRequestResponded(request.id);
      if (!("error" in r)) setResponded(true);
    });
  }

  return (
    <Card>
      <CardContent className="py-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 text-left">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{clientName(request)}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{request.raw_text}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {request.priority && <PriorityBadge priority={request.priority} />}
            {responded ? <Badge variant="success">Responded</Badge> : <RequestStatusBadge status={request.status} />}
            {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </div>
        </button>

        {open && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            <div className="rounded-lg bg-secondary/40 p-3">
              <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">Original request</p>
              <p className="mt-1 text-sm whitespace-pre-line">{request.raw_text}</p>
            </div>

            {request.suggested_approach && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Lightbulb className="size-3.5 shrink-0" /> Suggested approach
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{request.suggested_approach}</p>
                {request.covered_by_maintenance !== null && (
                  <p className="mt-1.5 text-xs">
                    <Badge variant={request.covered_by_maintenance ? "success" : "warning"}>
                      {request.covered_by_maintenance ? "Covered by their plan" : "Additional scope"}
                    </Badge>
                    {request.coverage_reasoning && (
                      <span className="ml-2 text-muted-foreground">{request.coverage_reasoning}</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {request.missing_info && request.missing_info.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <CircleAlert className="size-3.5 shrink-0" /> Still need from the client
                </p>
                <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                  {request.missing_info.map((q) => (
                    <li key={q}>• {q}</li>
                  ))}
                </ul>
              </div>
            )}

            {tasks.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <ListTodo className="size-3.5 shrink-0" /> Task
                </p>
                <div className="space-y-2">
                  {tasks.map((t) => (
                    <TaskRow key={t.id} task={t} projects={projects} />
                  ))}
                </div>
              </div>
            )}

            {request.draft_response !== null && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Draft reply</p>
                  <CopyButton text={draft} />
                </div>
                <Textarea
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setDraftSaved(false);
                  }}
                  rows={4}
                  className="text-sm"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Not sent automatically — copy it into your own email or reply in whatever tool you actually use.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={draftPending} onClick={saveDraft}>
                    {draftPending ? "Saving…" : "Save edits"}
                  </Button>
                  {draftSaved && <span className="text-xs text-accent">Saved.</span>}
                </div>
              </div>
            )}

            <div className="flex justify-end border-t border-border pt-3">
              {responded ? (
                <Badge variant="success" className="gap-1">
                  <Check className="size-3" /> Responded
                </Badge>
              ) : (
                <Button size="sm" disabled={respondPending} onClick={markResponded}>
                  {respondPending ? "…" : "Mark as responded"}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RequestsPanel({ requests, tasks, projects }: { requests: Request[]; tasks: Task[]; projects: Project[] }) {
  const [filter, setFilter] = useState<"all" | "open" | "responded">("open");

  const tasksByRequest = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const list = map.get(t.request_id) ?? [];
      list.push(t);
      map.set(t.request_id, list);
    }
    return map;
  }, [tasks]);

  const projectsByClient = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const p of projects) {
      const list = map.get(p.client_id) ?? [];
      list.push(p);
      map.set(p.client_id, list);
    }
    return map;
  }, [projects]);

  const visible = useMemo(() => {
    if (filter === "all") return requests;
    if (filter === "responded") return requests.filter((r) => r.responded_at);
    return requests.filter((r) => !r.responded_at);
  }, [requests, filter]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold md:text-3xl">Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What your clients have raised through their portal — categorised and analysed automatically, drafted
          replies included. Nothing is ever sent on its own; you review and reply yourself.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Inbox className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing yet — this fills in as soon as one of your clients raises something through their portal.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            {(["open", "all", "responded"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "secondary" : "ghost"} onClick={() => setFilter(f)}>
                {f === "open" ? "Needs a reply" : f === "responded" ? "Responded" : "All"}
              </Button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nothing in this view.
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  tasks={tasksByRequest.get(r.id) ?? []}
                  projects={projectsByClient.get(r.client_id) ?? []}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
