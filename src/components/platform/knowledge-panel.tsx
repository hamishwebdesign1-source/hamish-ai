"use client";

import { useState, useTransition } from "react";
import { BookOpen, Plus, Pencil, Trash2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createKnowledgeEntry, updateKnowledgeEntry, deleteKnowledgeEntry } from "@/app/studio/(authed)/knowledge/actions";

type Client = { id: string; business_name: string };
type Entry = { id: string; client_id: string | null; title: string; content: string; created_at: string };

const selectClasses =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function clientName(clientId: string | null, clients: Client[]) {
  if (!clientId) return "General";
  return clients.find((c) => c.id === clientId)?.business_name ?? "Unknown client";
}

function NewEntryForm({ clients }: { clients: Client[] }) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" /> Add entry
      </Button>
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await createKnowledgeEntry(clientId || null, title, content);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to save.");
        return;
      }
      setClientId("");
      setTitle("");
      setContent("");
      setOpen(false);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div>
          <Label className="text-xs">Applies to</Label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={selectClasses}>
            <option value="">General (all clients)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="new-kb-title" className="text-xs">
            Question / topic
          </Label>
          <Input id="new-kb-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are your opening hours?" />
        </div>
        <div>
          <Label htmlFor="new-kb-content" className="text-xs">
            Answer
          </Label>
          <Textarea id="new-kb-content" value={content} onChange={(e) => setContent(e.target.value)} rows={3} placeholder="Mon–Fri 9am–5pm, closed weekends." />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={pending || !title.trim() || !content.trim()} onClick={submit}>
            {pending ? "Saving…" : "Save entry"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function EntryCard({ entry, clients }: { entry: Entry; clients: Client[] }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await updateKnowledgeEntry(entry.id, title, content);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to save.");
        return;
      }
      setEditing(false);
    });
  }

  function remove() {
    startTransition(async () => {
      const r = await deleteKnowledgeEntry(entry.id);
      if (r && "error" in r) setError(r.error ?? "Failed to delete.");
    });
  }

  if (editing) {
    return (
      <Card>
        <CardContent className="space-y-3 py-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={pending || !title.trim() || !content.trim()} onClick={save}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant={entry.client_id ? "accent" : "secondary"}>{clientName(entry.client_id, clients)}</Badge>
            </div>
            <p className="mt-1.5 text-sm font-medium">{entry.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{entry.content}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" />
            </Button>
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
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

export function KnowledgePanel({ clients, entries }: { clients: Client[]; entries: Entry[] }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-semibold md:text-3xl">Knowledge base</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        What your clients&apos; AI Copilot and support agent draw on to answer questions instantly — leave a client
        unset for answers that apply to everyone.
      </p>

      <div className="mt-6">
        <NewEntryForm clients={clients} />
      </div>

      {entries.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center">
          <BookOpen className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No entries yet — add facts about your clients&apos; businesses so their support agent can answer
            instantly instead of every question becoming a request.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {entries.map((e) => (
            <EntryCard key={e.id} entry={e} clients={clients} />
          ))}
        </div>
      )}
    </div>
  );
}
