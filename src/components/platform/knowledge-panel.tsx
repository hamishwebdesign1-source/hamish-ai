"use client";

import { useState, useTransition } from "react";
import { BookOpen, Plus, Pencil, Trash2, X, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createKnowledgeEntry, updateKnowledgeEntry, deleteKnowledgeEntry } from "@/app/studio/(authed)/knowledge/actions";

type Client = { id: string; business_name: string; source_lead_id?: string | null };
type Entry = { id: string; client_id: string | null; title: string; content: string; created_at: string };
type Research = { business_summary: string; services: string[] };
type Draft = { clientId: string; title: string; content: string };

const selectClasses =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function clientName(clientId: string | null, clients: Client[]) {
  if (!clientId) return "General";
  return clients.find((c) => c.id === clientId)?.business_name ?? "Unknown client";
}

function researchToDraft(client: Client, research: Research): Draft {
  const content = research.services.length
    ? `${research.business_summary}\n\nServices: ${research.services.join(", ")}`
    : research.business_summary;
  return { clientId: client.id, title: `About ${client.business_name}`, content };
}

// A single controlled form, driven by KnowledgePanel's own `draft` state —
// used both for a plain manual "Add entry" click (empty draft) and for
// "Add to knowledge base" on a research-import card (pre-filled draft).
// Same createKnowledgeEntry() Server Action either way — importing
// research doesn't skip the human-reviews-before-it-saves step every
// other AI-touched save in this app follows, it just saves the tenant
// from retyping what's already real.
function EntryForm({
  draft,
  clients,
  onCancel,
  onSaved,
}: {
  draft: Draft;
  clients: Client[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [clientId, setClientId] = useState(draft.clientId);
  const [title, setTitle] = useState(draft.title);
  const [content, setContent] = useState(draft.content);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await createKnowledgeEntry(clientId || null, title, content);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to save.");
        return;
      }
      onSaved();
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
          <Label htmlFor="kb-title" className="text-xs">
            Question / topic
          </Label>
          <Input id="kb-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are your opening hours?" />
        </div>
        <div>
          <Label htmlFor="kb-content" className="text-xs">
            Answer
          </Label>
          <Textarea id="kb-content" value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="Mon–Fri 9am–5pm, closed weekends." />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={pending || !title.trim() || !content.trim()} onClick={submit}>
            {pending ? "Saving…" : "Save entry"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function ResearchImportCard({ client, research, onImport }: { client: Client; research: Research; onImport: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex items-start justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
            <Sparkles className="size-3.5 shrink-0" /> Already researched — {client.business_name}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{research.business_summary}</p>
        </div>
        <Button size="sm" variant="outline" className="shrink-0" onClick={onImport}>
          Add to knowledge base
        </Button>
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

export function KnowledgePanel({
  clients,
  entries,
  researchByClient,
}: {
  clients: Client[];
  entries: Entry[];
  researchByClient: Record<string, Research>;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const researchClients = clients.filter((c) => researchByClient[c.id]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-semibold md:text-3xl">Knowledge base</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        What your clients&apos; AI Copilot and support agent draw on to answer questions instantly — leave a client
        unset for answers that apply to everyone.
      </p>

      {researchClients.length > 0 && (
        <div className="mt-6 space-y-2">
          {researchClients.map((c) => (
            <ResearchImportCard
              key={c.id}
              client={c}
              research={researchByClient[c.id]}
              onImport={() => setDraft(researchToDraft(c, researchByClient[c.id]))}
            />
          ))}
        </div>
      )}

      <div className="mt-6">
        {draft ? (
          <EntryForm draft={draft} clients={clients} onCancel={() => setDraft(null)} onSaved={() => setDraft(null)} />
        ) : (
          <Button size="sm" onClick={() => setDraft({ clientId: "", title: "", content: "" })}>
            <Plus className="size-3.5" /> Add entry
          </Button>
        )}
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
