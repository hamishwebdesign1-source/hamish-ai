"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, X, ExternalLink, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/project-dates";
import { createDeliverable, deleteDeliverable } from "@/app/studio/(authed)/projects/actions";

type Deliverable = {
  id: string;
  title: string;
  description: string | null;
  link_url: string | null;
  submitted_by: string | null;
  submitted_at: string;
};

// Projects Kanban Command Centre, Phase C1 -- the one real, honest
// "state" a deliverable has: client visibility, and it belongs to the
// *project* (via projects.stage), not the deliverable -- every
// deliverable on one project shares it, since it's C1's RLS stage-gate,
// not a per-row flag. Rendered once, at the section level, per
// DESIGN-SYSTEM.md's "Deliverable submit-and-review pattern." Colours
// are pulled straight from project-stages.ts's own badgeVariant for
// client_review/completed (warning/success) so this agrees with the
// ProjectStageBadge already shown above it on the same page.
function VisibilityBanner({ stage }: { stage: string }) {
  if (stage === "client_review") {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
        <Eye className="size-3.5 shrink-0 text-warning" />
        <p className="text-xs text-warning">Visible to the client now — everything below appears in their portal.</p>
      </div>
    );
  }
  if (stage === "completed") {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2">
        <Eye className="size-3.5 shrink-0 text-success" />
        <p className="text-xs text-success">Visible to the client — this project is complete.</p>
      </div>
    );
  }
  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
      <EyeOff className="size-3.5 shrink-0 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">
        Not visible in the client portal yet. Deliverables appear there once this project moves to Client review.
      </p>
    </div>
  );
}

// Row shape mirrors project-task-list.tsx's TaskRow -- title + optional
// description + optional link + a meta line -- with the one established
// confirm-delete pattern this codebase already has (knowledge-panel.tsx's
// EntryCard) in place of Tasks' status-button trio, since a deliverable
// has no status column in C1.
function DeliverableRow({ deliverable }: { deliverable: Deliverable }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    startTransition(async () => {
      const r = await deleteDeliverable(deliverable.id);
      if (r && "error" in r) setError(r.error ?? "Failed to delete.");
    });
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{deliverable.title}</p>
        <div className="flex shrink-0 items-center gap-1">
          {confirmingDelete ? (
            <>
              <Button size="xs" variant="destructive" disabled={pending} onClick={remove}>
                {pending ? "…" : "Confirm"}
              </Button>
              <Button size="icon" variant="ghost" aria-label="Cancel delete" onClick={() => setConfirmingDelete(false)}>
                <X className="size-3.5" />
              </Button>
            </>
          ) : (
            <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => setConfirmingDelete(true)}>
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
      {deliverable.description && <p className="mt-1 text-xs text-muted-foreground">{deliverable.description}</p>}
      {deliverable.link_url && (
        <a
          href={deliverable.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 flex w-fit items-center gap-1 text-xs text-accent underline underline-offset-2"
        >
          <ExternalLink className="size-3" /> View link
        </a>
      )}
      <p className="mt-1.5 text-xs text-muted-foreground">
        Submitted by {deliverable.submitted_by ?? "—"} · {formatDate(deliverable.submitted_at)}
      </p>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// "Submit a deliverable directly against this project" -- identical
// dashed-border expand-in-place shape to NewTaskForm, one extra optional
// Link field. No submitted_by field -- never user-entered, set
// server-side from the acting session's email (createDeliverable).
function NewDeliverableForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" /> Add a deliverable
      </Button>
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await createDeliverable(projectId, title, description || null, linkUrl || null);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to submit the deliverable.");
        return;
      }
      setTitle("");
      setDescription("");
      setLinkUrl("");
      setOpen(false);
    });
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-3">
      <Label htmlFor="new-deliverable-title" className="text-xs">
        Title
      </Label>
      <Input
        id="new-deliverable-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-8 text-sm"
        placeholder="Homepage redesign — staging build"
        autoFocus
      />
      <Label htmlFor="new-deliverable-description" className="mt-2 block text-xs">
        Description (optional)
      </Label>
      <Textarea
        id="new-deliverable-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="text-sm"
        rows={2}
      />
      <Label htmlFor="new-deliverable-link" className="mt-2 block text-xs">
        Link (optional)
      </Label>
      <Input
        id="new-deliverable-link"
        type="url"
        value={linkUrl}
        onChange={(e) => setLinkUrl(e.target.value)}
        className="h-8 text-sm"
        placeholder="https://staging.example.com"
      />
      <p className="mt-1 text-xs text-muted-foreground">Staging link, doc, or file location</p>
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" disabled={pending || !title.trim()} onClick={submit}>
          {pending ? "Submitting…" : "Submit deliverable"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ProjectDeliverableList({
  projectId,
  projectStage,
  deliverables,
}: {
  projectId: string;
  projectStage: string;
  deliverables: Deliverable[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold">Deliverables</h2>
        <NewDeliverableForm projectId={projectId} />
      </div>
      <VisibilityBanner stage={projectStage} />
      {deliverables.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No deliverables submitted yet.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {deliverables.map((d) => (
            <DeliverableRow key={d.id} deliverable={d} />
          ))}
        </div>
      )}
    </div>
  );
}
