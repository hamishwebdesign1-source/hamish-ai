import { revalidatePath } from "next/cache";
import { BookOpen, X } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { deleteKnowledgeEntry } from "@/app/admin/actions";
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

export default async function KnowledgePage() {
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
      <h1 className="font-heading text-2xl font-semibold">Knowledge base</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        What the portal support agent draws on to answer client questions instantly. Leave a client unset for
        answers that apply to everyone.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="h-fit">
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

        <div>
          <h2 className="font-heading text-lg font-medium">All entries</h2>
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
