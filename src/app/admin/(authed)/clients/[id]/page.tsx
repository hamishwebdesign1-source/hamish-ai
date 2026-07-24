import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { triageRequest } from "@/lib/triage-request";
import { updateTaskStatus } from "@/app/admin/actions";
import { ProgressReportButton } from "@/components/admin/progress-report-button";
import { SiteCheckButton } from "@/components/admin/site-check-button";

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

const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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

  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: tasks } = requestIds.length
    ? await supabase
        .from("tasks")
        .select("*")
        .in("request_id", requestIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const { data: siteChecks } = await supabase
    .from("site_checks")
    .select("*")
    .eq("client_id", id)
    .order("checked_at", { ascending: false })
    .limit(1);
  const latestCheck = siteChecks?.[0] ?? null;

  const logRequestWithId = logRequest.bind(null, id);
  const revalidatePath = `/admin/clients/${id}`;

  return (
    <div>
      <Link href="/admin/clients" className="text-sm text-muted-foreground hover:text-foreground">
        ← All clients
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-semibold">{client.business_name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {client.name} · {client.email || "no email on file"}
        {client.website_url && (
          <>
            {" · "}
            <a href={client.website_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              {client.website_url}
            </a>
          </>
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-border px-3 py-1">{client.package || "No package"}</span>
        <span className="rounded-full border border-border px-3 py-1">{client.maintenance_plan} plan</span>
      </div>
      {client.email && (
        <p className="mt-3 text-xs text-muted-foreground">
          Portal access: they can sign in at{" "}
          <Link href="/portal/login" className="text-accent hover:underline">
            /portal/login
          </Link>{" "}
          with <span className="font-medium text-foreground">{client.email}</span>.
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ProgressReportButton clientId={id} />
        {client.website_url && <SiteCheckButton clientId={id} latestCheck={latestCheck} />}
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

      <div className="mt-8">
        <h2 className="font-heading text-lg font-medium">Tasks</h2>
        {!tasks?.length && <p className="mt-3 text-sm text-muted-foreground">No tasks yet.</p>}
        <ul className="mt-4 space-y-2">
          {tasks?.map((t) => {
            const isBlocked = t.status !== "done" && Date.now() - new Date(t.created_at).getTime() > SEVEN_DAYS_MS;
            return (
              <li key={t.id} className="rounded-lg border border-border bg-background px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{t.title}</p>
                  {isBlocked && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-medium text-clay uppercase" style={{ background: "var(--clay-soft)", color: "var(--clay)" }}>
                      <AlertTriangle className="size-3" />
                      Needs attention
                    </span>
                  )}
                </div>
                {t.description && <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>}
                <div className="mt-3 flex gap-1.5">
                  {TASK_STATUSES.map((status) => (
                    <form key={status} action={updateTaskStatus.bind(null, t.id, status, revalidatePath)}>
                      <button
                        type="submit"
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                          t.status === status
                            ? "bg-primary text-primary-foreground"
                            : "border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {status.replace("_", " ")}
                      </button>
                    </form>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
