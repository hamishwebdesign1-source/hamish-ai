import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BookOpen, X, TriangleAlert, CircleCheck, Sparkles } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { deleteKnowledgeEntry } from "@/app/admin/actions";
import { extractTextFromFile } from "@/lib/document-text";
import { extractKnowledgeEntries } from "@/lib/extract-knowledge-entries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const selectClasses =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

async function addKnowledgeEntry(formData: FormData) {
  "use server";
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("knowledge_base").insert({
    client_id: String(formData.get("client_id") || "") || null,
    title: String(formData.get("title") || ""),
    content: String(formData.get("content") || ""),
  });

  if (error) console.error("Failed to insert knowledge entry:", error);

  revalidatePath("/admin/knowledge");
}

async function importKnowledgeFromDocument(formData: FormData) {
  "use server";
  const supabase = getSupabaseAdmin();
  if (!supabase) redirect("/admin/knowledge?importError=" + encodeURIComponent("Supabase is not configured."));

  const clientId = String(formData.get("client_id") || "") || null;
  const file = formData.get("document") as File | null;
  if (!file || file.size === 0) {
    redirect("/admin/knowledge?importError=" + encodeURIComponent("Choose a file first."));
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractTextFromFile(buffer, file.name);
  if (!text.trim()) {
    redirect("/admin/knowledge?importError=" + encodeURIComponent("Couldn't read any text from that file."));
  }

  const result = await extractKnowledgeEntries(text);
  if ("error" in result) redirect("/admin/knowledge?importError=" + encodeURIComponent(result.error));

  if (!result.entries.length) {
    redirect(
      "/admin/knowledge?importError=" +
        encodeURIComponent("No usable business facts found in that document — nothing was added.")
    );
  }

  const { error } = await supabase
    .from("knowledge_base")
    .insert(result.entries.map((e) => ({ client_id: clientId, title: e.title, content: e.content })));

  if (error) {
    console.error("Failed to insert extracted knowledge entries:", error);
    redirect("/admin/knowledge?importError=" + encodeURIComponent("Failed to save the extracted entries."));
  }

  revalidatePath("/admin/knowledge");
  redirect(`/admin/knowledge?imported=${result.entries.length}`);
}

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; importError?: string }>;
}) {
  const { imported, importError } = await searchParams;
  const supabase = getSupabaseAdmin();

  const { data: clients } = supabase
    ? await supabase.from("clients").select("id, business_name").order("business_name")
    : { data: [] };

  const { data: entries, error } = supabase
    ? await supabase
        .from("knowledge_base")
        .select("id, title, content, client_id, clients(business_name)")
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (error) console.error("Failed to fetch knowledge base:", error);

  return (
    <div>
      <h1 className="text-page-title">Knowledge base</h1>
      <p className="text-page-subtitle mt-1">
        What the portal support agent draws on to answer client questions instantly. Leave a client unset for
        answers that apply to everyone.
      </p>

      {imported && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">
          <CircleCheck className="size-4 shrink-0" />
          Added {imported} {Number(imported) === 1 ? "entry" : "entries"} from that document.
        </div>
      )}
      {importError && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {importError}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add an entry</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={addKnowledgeEntry} className="mt-2 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="client_id">Scope</Label>
                  <select id="client_id" name="client_id" defaultValue="" className={selectClasses}>
                    <option value="">All clients (general)</option>
                    {clients?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.business_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" placeholder="e.g. How to request a change" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="content">Answer</Label>
                  <Textarea id="content" name="content" placeholder="The answer, in plain English." required rows={5} />
                </div>
                <Button type="submit" className="w-full">
                  Add entry
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Import from a document</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={importKnowledgeFromDocument} className="mt-2 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="import_client_id">Scope</Label>
                  <select id="import_client_id" name="client_id" defaultValue="" className={selectClasses}>
                    <option value="">All clients (general)</option>
                    {clients?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.business_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="document">Document (.pdf, .docx, .txt)</Label>
                  <Input id="document" name="document" type="file" accept=".pdf,.docx,.txt,.md" required />
                </div>
                <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                  Business facts only — hours, pricing, policies, FAQs. Don&apos;t upload anything containing a
                  named customer&apos;s personal details.
                </p>
                <Button type="submit" variant="ai" className="w-full gap-1.5">
                  <Sparkles className="size-3.5" />
                  Extract entries
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-section-title">All entries</h2>
          {!entries?.length && (
            <Card className="mt-3">
              <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <BookOpen className="size-6 text-muted-foreground/60" />
                No entries yet — add your first one.
              </CardContent>
            </Card>
          )}
          <ul className="mt-4 space-y-2">
            {entries?.map((e) => (
              <li key={e.id} className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{e.title}</p>
                    <Badge variant={e.client_id ? "outline" : "accent"} className="mt-1.5">
                      {(e.clients as unknown as { business_name: string } | null)?.business_name || "All clients"}
                    </Badge>
                  </div>
                  <form action={deleteKnowledgeEntry.bind(null, e.id)}>
                    <Button type="submit" variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-destructive">
                      <X className="size-3.5" />
                    </Button>
                  </form>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{e.content}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
