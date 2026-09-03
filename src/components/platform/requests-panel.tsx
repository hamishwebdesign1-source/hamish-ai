"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Inbox,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  CircleAlert,
  ListTodo,
  Lightbulb,
  Globe,
  ArrowRight,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RequestStatusBadge, TaskStatusBadge, PriorityBadge } from "@/components/status-badges";
import {
  markRequestResponded,
  updateRequestDraft,
  updateTaskStatus,
  turnRequestIntoWebsiteTask,
  regenerateRequestDraft,
  sendRequestReply,
  assignRequest,
} from "@/app/studio/(authed)/requests/actions";
import { assignTaskToProject } from "@/app/studio/(authed)/projects/actions";
import { StudioPageHeader } from "@/components/platform/studio-page-header";
import type { TroubleshootingEntry } from "@/lib/website-troubleshooting";

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
  website_project_id: string | null;
  assigned_to: string | null;
  clients: { business_name: string } | { business_name: string }[] | null;
};

type TeamMember = { email: string; role: "owner" | "member" };

type WebsiteProject = { id: string; client_id: string; stage: string };

const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovery",
  brief: "Brief ready",
  tool: "Tool chosen",
  build: "Building",
  qa: "QA",
  launched: "Launched",
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
            aria-label="Assign task to project"
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

// AI Website Creation Guide, WB7 — the client-feedback-to-AI-task loop
// (plan doc §15). Only rendered when the request's client has at least
// one website project. Reuses the exact same diagnosis + fix-prompt
// shape the troubleshooting composer (WB5) shows, since it's the same
// generator underneath, just entered from Requests instead.
function WebsiteTaskSection({
  request,
  websiteProjects,
}: {
  request: Request;
  websiteProjects: WebsiteProject[];
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(request.website_project_id ?? websiteProjects[0]?.id ?? "");
  const [entry, setEntry] = useState<TroubleshootingEntry | null>(null);
  const [linkedProjectId, setLinkedProjectId] = useState(request.website_project_id);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    setError(null);
    if (!selectedProjectId) {
      setError("Choose a website project first.");
      return;
    }
    startTransition(async () => {
      const r = await turnRequestIntoWebsiteTask(request.id, selectedProjectId);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setEntry(r.entry);
      setLinkedProjectId(selectedProjectId);
    });
  }

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Globe className="size-3.5 shrink-0" /> Website build task
      </p>

      {!entry && linkedProjectId && (
        <p className="text-xs text-muted-foreground">
          Already turned into an AI coding task —{" "}
          <Link href={`/studio/website-builder/${linkedProjectId}`} className="text-accent hover:underline">
            view it in Website Builder
          </Link>
          .
        </p>
      )}

      {!linkedProjectId && (
        <div className="flex flex-wrap items-center gap-2">
          {websiteProjects.length > 1 && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={pending}
              aria-label="Choose website project"
              className={selectClasses}
            >
              {websiteProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {STAGE_LABELS[p.stage] ?? p.stage}
                </option>
              ))}
            </select>
          )}
          <Button size="xs" variant="outline" disabled={pending} onClick={generate}>
            {pending ? "Thinking…" : "Turn into an AI coding task"}
          </Button>
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}

      {entry && (
        <div className="mt-2.5 space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
          <p className="text-xs">{entry.diagnosis}</p>
          <pre className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background p-2.5 text-xs whitespace-pre-wrap">{entry.fixPrompt}</pre>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(entry.fixPrompt);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex items-center gap-1 rounded-md py-1.5 text-[11px] text-muted-foreground hover:text-accent"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? "Copied" : "Copy fix prompt"}
            </button>
            <Link href={`/studio/website-builder/${linkedProjectId}`} className="flex items-center gap-1 text-[11px] text-accent hover:underline">
              View in Website Builder <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// Studio improvement — an unanswered request read identically whether it
// arrived 10 minutes ago or 10 days ago; same "give a real heads-up
// before it's genuinely stale" shape as projects-panel.tsx's own
// due-soon tier and studio-engagement.ts's quietWeeks thresholds.
const REQUEST_AGE_WARNING_DAYS = 2;
const REQUEST_AGE_CRITICAL_DAYS = 5;

function requestAgeDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000));
}

function RequestCard({
  request,
  tasks,
  projects,
  websiteProjects,
  selected,
  onToggleSelect,
  canSendReply,
  teamMembers,
}: {
  request: Request;
  tasks: Task[];
  projects: Project[];
  websiteProjects: WebsiteProject[];
  selected?: boolean;
  onToggleSelect?: () => void;
  canSendReply: boolean;
  teamMembers: TeamMember[];
}) {
  const [open, setOpen] = useState(false);
  const [assignee, setAssignee] = useState(request.assigned_to ?? "");
  const [assignPending, startAssign] = useTransition();

  function setRequestAssignee(next: string) {
    const prev = assignee;
    setAssignee(next);
    startAssign(async () => {
      const r = await assignRequest(request.id, next || null);
      if (r && "error" in r) setAssignee(prev);
    });
  }
  const [draft, setDraft] = useState(request.draft_response ?? "");
  const [draftPending, startDraftSave] = useTransition();
  const [draftSaved, setDraftSaved] = useState(false);
  const [regenerating, startRegenerate] = useTransition();
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [respondPending, startRespond] = useTransition();
  const [responded, setResponded] = useState(Boolean(request.responded_at));
  const [respondError, setRespondError] = useState<string | null>(null);
  const [sendPending, startSend] = useTransition();
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function saveDraft() {
    setDraftSaved(false);
    startDraftSave(async () => {
      const r = await updateRequestDraft(request.id, draft);
      if (!("error" in r)) setDraftSaved(true);
    });
  }

  // Overwrites the textarea with a fresh AI attempt, same "still editable,
  // still not sent automatically" starting-point philosophy as the
  // original draft — a tenant can undo by just typing over it again, so
  // this doesn't need its own confirm step.
  function regenerateDraft() {
    setRegenerateError(null);
    setDraftSaved(false);
    startRegenerate(async () => {
      const r = await regenerateRequestDraft(request.id);
      if ("error" in r) {
        setRegenerateError(r.error ?? "Failed to regenerate — try again.");
        return;
      }
      setDraft(r.draftResponse);
    });
  }

  function markResponded() {
    setRespondError(null);
    startRespond(async () => {
      const r = await markRequestResponded(request.id);
      if ("error" in r) {
        setRespondError(r.error ?? "Failed to update — try again.");
        return;
      }
      setResponded(true);
    });
  }

  // Studio big-ticket — saves the textarea's current content first
  // (sendRequestReply() itself sends whatever's already in draft_response
  // in the database, so an unsaved edit would otherwise be silently
  // skipped over and the *previous* version sent instead), then sends it.
  // Same content a "Save edits" click alone would persist — this is that
  // plus actually sending it.
  function sendReply() {
    setSendError(null);
    startSend(async () => {
      const saveResult = await updateRequestDraft(request.id, draft);
      if ("error" in saveResult) {
        setSendError(saveResult.error ?? "Failed to save your edits — try again.");
        return;
      }
      const r = await sendRequestReply(request.id);
      if ("error" in r) {
        setSendError(r.error ?? "Failed to send — try again.");
        return;
      }
      setDraftSaved(true);
      setSent(true);
      setResponded(true);
    });
  }

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          {/* Studio improvement — bulk actions. Sibling to the toggle
              button, not nested inside it, same reasoning as
              prospecting-panel.tsx's own ProspectCard fix — a checkbox
              inside a clickable row would fire both the toggle and the
              expand/collapse on one click. Only rendered for an
              unresponded request, matching exactly when the per-row
              "Mark as responded" button below is itself shown — a
              checkbox with nothing for the bulk bar to do on this row
              would just be confusing. */}
          {!responded && onToggleSelect && (
            <input
              type="checkbox"
              checked={selected ?? false}
              onChange={onToggleSelect}
              aria-label={`Select request from ${clientName(request)}`}
              className="size-4 shrink-0 rounded border-border accent-accent"
            />
          )}
          {/* Studio big-ticket ("team collaboration") — sibling of the
              toggle button below, same reasoning as the checkbox above: a
              <select> nested inside a <button> would be invalid HTML and
              would fire the open/close toggle on every interaction. Only
              rendered once there's actually more than one person to
              assign to — a solo owner has no one else to hand this to. */}
          {teamMembers.length > 1 && (
            <select
              value={assignee}
              onChange={(e) => setRequestAssignee(e.target.value)}
              disabled={assignPending}
              aria-label={`Assign request from ${clientName(request)}`}
              className={`${selectClasses} shrink-0`}
            >
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.email} value={m.email}>
                  {m.email}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{clientName(request)}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{request.raw_text}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!responded &&
                (() => {
                  const age = requestAgeDays(request.created_at);
                  if (age < REQUEST_AGE_WARNING_DAYS) return null;
                  return (
                    <span className={`text-[11px] font-medium ${age >= REQUEST_AGE_CRITICAL_DAYS ? "text-destructive" : "text-warning"}`}>
                      {age}d old
                    </span>
                  );
                })()}
              {request.priority && <PriorityBadge priority={request.priority} />}
              {responded ? <Badge variant="success">Responded</Badge> : <RequestStatusBadge status={request.status} />}
              {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
            </div>
          </button>
        </div>

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

            {websiteProjects.length > 0 && <WebsiteTaskSection request={request} websiteProjects={websiteProjects} />}

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
                  disabled={sent}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {canSendReply
                    ? "Send it from here, or copy it into your own email if you'd rather reply that way."
                    : "Not sent automatically — copy it into your own email or reply in whatever tool you actually use."}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {/* Studio big-ticket — the actual send. Only offered
                      once the org's configured a reply-to email
                      (Settings > Email, roadmap item #1) and only until
                      this specific request has actually been sent —
                      sendRequestReply() itself re-checks both server-side
                      too. */}
                  {canSendReply && !sent && (
                    <Button size="sm" disabled={sendPending || !draft.trim()} onClick={sendReply}>
                      <Send className="size-3.5" /> {sendPending ? "Sending…" : "Send reply"}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" disabled={draftPending || sent} onClick={saveDraft}>
                    {draftPending ? "Saving…" : "Save edits"}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={regenerating || sent} onClick={regenerateDraft}>
                    <RefreshCw className={`size-3.5 ${regenerating ? "animate-spin" : ""}`} />
                    {regenerating ? "Regenerating…" : "Regenerate"}
                  </Button>
                  {draftSaved && !sent && <span className="text-xs text-accent">Saved.</span>}
                  {sent && <span className="text-xs text-accent">Sent.</span>}
                  {regenerateError && <span className="text-xs text-destructive">{regenerateError}</span>}
                  {sendError && <span className="text-xs text-destructive">{sendError}</span>}
                </div>
              </div>
            )}

            <div className="border-t border-border pt-3">
              <div className="flex justify-end">
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
              {respondError && <p className="mt-1.5 text-right text-xs text-destructive">{respondError}</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RequestsPanel({
  requests,
  tasks,
  projects,
  websiteProjects,
  canSendReply,
  teamMembers,
  currentUserEmail,
}: {
  requests: Request[];
  tasks: Task[];
  projects: Project[];
  websiteProjects: WebsiteProject[];
  canSendReply: boolean;
  teamMembers: TeamMember[];
  currentUserEmail: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "open" | "responded">("open");
  // Studio big-ticket ("team collaboration") — only meaningful once
  // there's more than one person on the org, same gate as the assignee
  // select itself.
  const [mineOnly, setMineOnly] = useState(false);
  // Studio improvement — same client-side search pattern as
  // prospecting-panel.tsx/knowledge-panel.tsx, filtering the request text
  // and its own client name, on top of (not instead of) the existing
  // open/all/responded status filter below.
  const [search, setSearch] = useState("");

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

  const websiteProjectsByClient = useMemo(() => {
    const map = new Map<string, WebsiteProject[]>();
    for (const p of websiteProjects) {
      const list = map.get(p.client_id) ?? [];
      list.push(p);
      map.set(p.client_id, list);
    }
    return map;
  }, [websiteProjects]);

  const visible = useMemo(() => {
    let list = filter === "all" ? requests : filter === "responded" ? requests.filter((r) => r.responded_at) : requests.filter((r) => !r.responded_at);
    if (mineOnly) list = list.filter((r) => r.assigned_to === currentUserEmail);
    const searchLower = search.trim().toLowerCase();
    if (searchLower) {
      list = list.filter((r) => r.raw_text.toLowerCase().includes(searchLower) || clientName(r).toLowerCase().includes(searchLower));
    }
    return list;
  }, [requests, filter, mineOnly, currentUserEmail, search]);

  // Studio improvement — bulk actions, same pattern as prospecting-panel.tsx's
  // own bulk "mark as contacted". Selection only ever holds unresponded
  // request ids (RequestCard itself only renders a checkbox for one) so
  // there's nothing to filter out at execution time.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPending, startBulk] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkDone, setBulkDone] = useState<number | null>(null);

  const selectableVisible = visible.filter((r) => !r.responded_at);
  const visibleSelectedCount = selectableVisible.filter((r) => selected.has(r.id)).length;
  const allVisibleSelected = selectableVisible.length > 0 && visibleSelectedCount === selectableVisible.length;

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
        for (const r of selectableVisible) next.delete(r.id);
      } else {
        for (const r of selectableVisible) next.add(r.id);
      }
      return next;
    });
  }

  function bulkMarkResponded() {
    const ids = Array.from(selected);
    if (ids.length === 0 || bulkPending) return;
    setBulkError(null);
    setBulkDone(null);
    startBulk(async () => {
      const results = await Promise.all(ids.map((id) => markRequestResponded(id)));
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
        title="Requests"
        description="What your clients have raised through their portal — categorised and analysed automatically, drafted replies included. Nothing is ever sent on its own; you review and reply yourself."
      />

      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Inbox className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing yet — this fills in as soon as one of your clients raises something through their portal.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {(["open", "all", "responded"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "secondary" : "ghost"} onClick={() => setFilter(f)}>
                {f === "open" ? "Needs a reply" : f === "responded" ? "Responded" : "All"}
              </Button>
            ))}
            {teamMembers.length > 1 && (
              <Button size="sm" variant={mineOnly ? "secondary" : "ghost"} onClick={() => setMineOnly((v) => !v)}>
                Assigned to me
              </Button>
            )}
            {requests.length > 4 && (
              <div className="relative ml-auto w-full max-w-56">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests…" className="h-8 pl-8 text-xs" />
              </div>
            )}
          </div>

          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {search.trim() ? "No requests match that search." : "Nothing in this view."}
            </div>
          ) : (
            <>
              {selectableVisible.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all unanswered visible requests"
                    className="size-4 shrink-0 rounded border-border accent-accent"
                  />
                  <span>Select all {selectableVisible.length} unanswered</span>
                  {selected.size > 0 && (
                    <span className="ml-auto flex items-center gap-2">
                      <span>{selected.size} selected</span>
                      <Button size="xs" variant="outline" disabled={bulkPending} onClick={bulkMarkResponded}>
                        {bulkPending ? "Updating…" : `Mark ${selected.size} as responded`}
                      </Button>
                    </span>
                  )}
                </div>
              )}
              {bulkDone !== null && !bulkPending && (
                <p className="text-xs text-accent">
                  {bulkDone} request{bulkDone === 1 ? "" : "s"} marked as responded.
                </p>
              )}
              {bulkError && <p className="text-xs text-destructive">{bulkError}</p>}
              <div className="space-y-2">
                {visible.map((r) => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    tasks={tasksByRequest.get(r.id) ?? []}
                    projects={projectsByClient.get(r.client_id) ?? []}
                    websiteProjects={websiteProjectsByClient.get(r.client_id) ?? []}
                    selected={selected.has(r.id)}
                    onToggleSelect={() => toggleSelected(r.id)}
                    canSendReply={canSendReply}
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
