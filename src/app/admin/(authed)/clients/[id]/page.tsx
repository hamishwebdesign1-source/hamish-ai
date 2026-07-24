import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { triageRequest } from "@/lib/triage-request";

async function logRequest(clientId: string, formData: FormData) {
  "use server";
  const rawText = String(formData.get("raw_text") || "").trim();
  if (!rawText) return;

  const result = await triageRequest(clientId, rawText);
  if ("request" in result) {
    redirect(`/admin/requests/${result.request.id}`);
  }
}

const priorityStyles: Record<string, string> = {
  urgent: "bg-destructive/10 text-destructive",
  high: "bg-clay-soft text-clay",
  medium: "bg-accent/10 text-accent",
  low: "bg-secondary text-secondary-foreground",
};

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) notFound();

  const { data: client } = await supabase.from("clients").select("*").eq("id", id).single();
  if (!client) notFound();

  const { data: requests } = await supabase
    .from("requests")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const logRequestWithId = logRequest.bind(null, id);

  return (
    <div>
      <Link href="/admin/clients" className="text-sm text-muted-foreground hover:text-foreground">
        ← All clients
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-semibold">{client.business_name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {client.name} · {client.email || "no email on file"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-border px-3 py-1">{client.package || "No package"}</span>
        <span className="rounded-full border border-border px-3 py-1">{client.maintenance_plan} plan</span>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border border-border p-5">
          <h2 className="font-heading text-lg font-medium">Log a new request</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste in whatever the client said — email, call notes, chat message.
          </p>
          <form action={logRequestWithId} className="mt-4 space-y-3">
            <textarea
              name="raw_text"
              required
              rows={6}
              placeholder="e.g. Can you update our opening hours to 8am-6pm Mon-Fri?"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <button
              type="submit"
              className="h-9 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Run AI triage
            </button>
          </form>
        </div>

        <div>
          <h2 className="font-heading text-lg font-medium">Request history</h2>
          {!requests?.length && (
            <p className="mt-3 text-sm text-muted-foreground">No requests logged yet.</p>
          )}
          <ul className="mt-4 space-y-2">
            {requests?.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/requests/${r.id}`}
                  className="card-interactive block rounded-lg border border-border bg-background px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-medium">{r.raw_text}</p>
                    {r.priority && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${priorityStyles[r.priority] || ""}`}
                      >
                        {r.priority}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.status} {r.category ? `· ${r.category}` : ""} {r.complexity ? `· ${r.complexity}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
