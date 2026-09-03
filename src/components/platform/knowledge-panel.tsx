"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BookOpen, Plus, Pencil, Trash2, X, Sparkles, Search, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  createKnowledgeEntry,
  updateKnowledgeEntry,
  deleteKnowledgeEntry,
  extractKnowledgeFromDocument,
  importKnowledgeEntries,
} from "@/app/studio/(authed)/knowledge/actions";
import { StudioPageHeader } from "@/components/platform/studio-page-header";

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
          <Label htmlFor="kb-client" className="text-xs">
            Applies to
          </Label>
          <select id="kb-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className={selectClasses}>
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

// Studio big-ticket ("Knowledge Base AI document import") — the tenant
// equivalent of admin's own importKnowledgeFromDocument()
// (/admin/(authed)/knowledge/page.tsx). Deliberately a two-step
// extract-then-review flow, not admin's direct insert: same
// "importing research doesn't skip the human-reviews-before-it-saves
// step" convention EntryForm's own comment documents above — a tenant
// can edit or drop any extracted entry before anything is actually
// saved, via the same review-list shape, just for many entries at once
// instead of one.
type ExtractedEntry = { title: string; content: string };

function DocumentImportControl({ clients }: { clients: Client[] }) {
  const [clientId, setClientId] = useState("");
  const [extractPending, startExtract] = useTransition();
  const [extractError, setExtractError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<ExtractedEntry[] | null>(null);
  const [savePending, startSave] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function extract(formData: FormData) {
    setExtractError(null);
    startExtract(async () => {
      const r = await extractKnowledgeFromDocument(formData);
      if ("error" in r) {
        setExtractError(r.error);
        return;
      }
      setReviewing(r.entries);
    });
  }

  function updateEntry(index: number, field: "title" | "content", value: string) {
    setReviewing((prev) => (prev ? prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)) : prev));
  }

  function removeEntry(index: number) {
    setReviewing((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  function saveAll() {
    if (!reviewing?.length) return;
    setSaveError(null);
    startSave(async () => {
      const r = await importKnowledgeEntries(clientId || null, reviewing);
      if (r && "error" in r) {
        setSaveError(r.error ?? "Failed to save.");
        return;
      }
      setReviewing(null);
      setOpen(false);
    });
  }

  if (reviewing) {
    return (
      <Card>
        <CardContent className="space-y-3 py-4">
          <p className="text-xs font-semibold text-muted-foreground">
            {reviewing.length} entr{reviewing.length === 1 ? "y" : "ies"} found — review before saving
          </p>
          <div className="space-y-2">
            {reviewing.map((e, i) => (
              <div key={i} className="rounded-lg border border-border p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <Input value={e.title} onChange={(ev) => updateEntry(i, "title", ev.target.value)} className="h-8 text-sm font-medium" />
                  <Button size="xs" variant="ghost" onClick={() => removeEntry(i)} aria-label={`Remove "${e.title}"`}>
                    <X className="size-3.5" />
                  </Button>
                </div>
                <Textarea value={e.content} onChange={(ev) => updateEntry(i, "content", ev.target.value)} rows={2} className="mt-1.5 text-xs" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={savePending || reviewing.length === 0} onClick={saveAll}>
              {savePending ? "Saving…" : `Save ${reviewing.length} entr${reviewing.length === 1 ? "y" : "ies"}`}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
          </div>
          {saveError && <p className="text-xs text-destructive">{saveError}</p>}
        </CardContent>
      </Card>
    );
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Upload className="size-3.5" /> Import from document
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <p className="text-xs text-muted-foreground">
          Upload a document (.pdf, .docx, .txt) and the AI splits it into entries you can review before saving —
          business facts only, hours, pricing, policies, FAQs.
        </p>
        <div>
          <Label htmlFor="kb-import-client" className="text-xs">
            Applies to
          </Label>
          <select id="kb-import-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className={selectClasses}>
            <option value="">General (all clients)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="kb-import-file" className="text-xs">
            Document
          </Label>
          <input
            ref={fileInputRef}
            id="kb-import-file"
            name="document"
            type="file"
            accept=".pdf,.docx,.txt,.md"
            required
            className="block w-full text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={extractPending}
            onClick={() => {
              const file = fileInputRef.current?.files?.[0];
              if (!file) {
                setExtractError("Choose a file first.");
                return;
              }
              const formData = new FormData();
              formData.set("document", file);
              extract(formData);
            }}
          >
            {extractPending ? "Extracting…" : "Extract entries"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
        {extractError && <p className="text-xs text-destructive">{extractError}</p>}
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

  // Studio improvement — a plain client-side filter, same pattern
  // prospecting-panel.tsx's own search bar already uses: no new query,
  // no new AI call, just narrowing a list an org is already scrolling
  // through once entry count grows past a screenful. "" (All) and the
  // synthetic "__general__" value (entries with no client_id) are the
  // same two special cases clientName() already treats as real states.
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const searchLower = search.trim().toLowerCase();
  const filteredEntries = entries.filter((e) => {
    if (searchLower && !e.title.toLowerCase().includes(searchLower) && !e.content.toLowerCase().includes(searchLower)) return false;
    if (clientFilter === "__general__") return e.client_id === null;
    if (clientFilter && e.client_id !== clientFilter) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl">
      <StudioPageHeader
        eyebrow="Deliver"
        title="Knowledge base"
        description={
          <>
            What your clients&apos; AI Copilot and support agent draw on to answer questions instantly — leave a
            client unset for answers that apply to everyone. This is also step one for putting a chatbot on a
            client&apos;s own website — once they have facts here, turn it on from their card in{" "}
            <Link href="/studio/clients" className="text-accent underline underline-offset-2">
              Clients
            </Link>
            .
          </>
        }
      />

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

      <div className="mt-6 space-y-3">
        {draft ? (
          <EntryForm draft={draft} clients={clients} onCancel={() => setDraft(null)} onSaved={() => setDraft(null)} />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setDraft({ clientId: "", title: "", content: "" })}>
              <Plus className="size-3.5" /> Add entry
            </Button>
            <DocumentImportControl clients={clients} />
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries…"
              className="pl-8"
            />
          </div>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            aria-label="Filter knowledge base entries by client"
            className={`${selectClasses} sm:w-56`}
          >
            <option value="">All entries</option>
            <option value="__general__">General (all clients)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center">
          <BookOpen className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No entries yet — add facts about your clients&apos; businesses so their support agent can answer
            instantly instead of every question becoming a request.
          </p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No entries match that search or filter.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {filteredEntries.map((e) => (
            <EntryCard key={e.id} entry={e} clients={clients} />
          ))}
        </div>
      )}
    </div>
  );
}
