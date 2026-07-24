import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import { deleteKnowledgeEntry } from "@/app/admin/actions";

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

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border border-border p-5">
          <h2 className="font-heading text-lg font-medium">Add an entry</h2>
          <form action={addKnowledgeEntry} className="mt-4 space-y-3">
            <select
              name="client_id"
              defaultValue=""
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">All clients (general)</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name}
                </option>
              ))}
            </select>
            <input
              name="title"
              placeholder="e.g. How to request a change"
              required
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <textarea
              name="content"
              placeholder="The answer, in plain English."
              required
              rows={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <button
              type="submit"
              className="h-9 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Add entry
            </button>
          </form>
        </div>

        <div>
          <h2 className="font-heading text-lg font-medium">All entries</h2>
          {!entries?.length && (
            <p className="mt-3 text-sm text-muted-foreground">No entries yet — add your first one.</p>
          )}
          <ul className="mt-4 space-y-2">
            {entries?.map((e) => (
              <li key={e.id} className="rounded-lg border border-border bg-background px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(e.clients as unknown as { business_name: string } | null)?.business_name ||
                        "All clients"}
                    </p>
                  </div>
                  <form action={deleteKnowledgeEntry.bind(null, e.id)}>
                    <button type="submit" className="text-xs text-muted-foreground hover:text-destructive">
                      Delete
                    </button>
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
