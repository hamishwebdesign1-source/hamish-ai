import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { updateTaskStatus, updateDraftResponse } from "@/app/admin/actions";

const priorityStyles: Record<string, string> = {
  urgent: "bg-destructive/10 text-destructive",
  high: "bg-clay-soft text-clay",
  medium: "bg-accent/10 text-accent",
  low: "bg-secondary text-secondary-foreground",
};

const TASK_STATUSES = ["todo", "in_progress", "done"] as const;

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) notFound();

  const { data: req } = await supabase.from("requests").select("*").eq("id", id).single();
  if (!req) notFound();

  const [{ data: client }, { data: tasks }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", req.client_id).single(),
    supabase.from("tasks").select("*").eq("request_id", id),
  ]);

  return (
    <div>
      {client && (
        <Link href={`/admin/clients/${client.id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {client.business_name}
        </Link>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {req.priority && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium uppercase ${priorityStyles[req.priority] || ""}`}
          >
            {req.priority} priority
          </span>
        )}
        {req.category && (
          <span className="rounded-full border border-border px-2.5 py-1 text-xs uppercase">{req.category}</span>
        )}
        {req.complexity && (
          <span className="rounded-full border border-border px-2.5 py-1 text-xs">{req.complexity}</span>
        )}
        <span className="rounded-full border border-border px-2.5 py-1 text-xs">{req.status}</span>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-5">
        <p className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Original request
        </p>
        <p className="mt-2 whitespace-pre-line">{req.raw_text}</p>
      </div>

      {req.missing_info?.length > 0 && (
        <div className="mt-6 rounded-xl border border-warning/40 bg-warning-soft p-5" style={{ borderColor: "var(--clay)", background: "var(--clay-soft)" }}>
          <p className="font-mono text-xs font-medium tracking-wide text-clay uppercase">
            Ask the client this before proceeding
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {req.missing_info.map((q: string, i: number) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border p-5">
          <p className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Maintenance coverage
          </p>
          <p className="mt-2 font-heading text-lg font-semibold">
            {req.covered_by_maintenance ? "Covered" : "Not covered — new scope"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{req.coverage_reasoning}</p>
        </div>
        <div className="rounded-xl border border-border p-5">
          <p className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Suggested approach
          </p>
          <p className="mt-2 text-sm">{req.suggested_approach}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="font-mono text-xs font-medium tracking-wide text-accent uppercase">
          Draft response to send
        </p>
        <form action={updateDraftResponse.bind(null, req.id)} className="mt-2">
          <textarea
            name="draft_response"
            defaultValue={req.draft_response}
            rows={6}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <button
            type="submit"
            className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
          >
            Save draft
          </button>
        </form>
      </div>

      {tasks && tasks.length > 0 && (
        <div className="mt-6 rounded-xl border border-border p-5">
          <p className="font-mono text-xs font-medium tracking-wide text-violet uppercase" style={{ color: "var(--gradient-violet)" }}>
            Suggested task
          </p>
          {tasks.map((t) => (
            <div key={t.id} className="mt-2">
              <p className="font-heading text-base font-medium">{t.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
              {t.acceptance_criteria && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Acceptance criteria: </span>
                  {t.acceptance_criteria}
                </p>
              )}
              <div className="mt-3 flex gap-1.5">
                {TASK_STATUSES.map((status) => (
                  <form key={status} action={updateTaskStatus.bind(null, t.id, status, `/admin/requests/${req.id}`)}>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
