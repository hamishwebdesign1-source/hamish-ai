import { CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { CRON_SPECS } from "@/lib/cron-schedule";
import { timeAgo } from "@/lib/time-ago";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// No searchParams and no dynamic API usage means Next would otherwise
// statically prerender this at build time and freeze it there — the
// opposite of what a live cron-status page needs. Found by comparing this
// stage's build output to Stage 4's and noticing /admin (Command Centre)
// has the exact same gap; fixed there too, in the same pass.
export const dynamic = "force-dynamic";

type CronRun = {
  id: string;
  cron_name: string;
  status: "success" | "error";
  summary: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
};

// A run "succeeded" (executed to completion) but still might have found
// something worth a look — kept as a distinct "Needs attention" state
// rather than folded into either Completed or Failed, per cron, since
// each job's summary shape means something different.
function needsAttention(cronName: string, summary: Record<string, unknown> | null): boolean {
  if (!summary) return false;
  switch (cronName) {
    case "self-check":
      return summary.ok === false;
    case "site-checks":
      return Number(summary.flagged ?? 0) > 0 || Number(summary.checkFailures ?? 0) > 0;
    case "lead-discovery":
      return Number(summary.searchFailures ?? 0) > 0;
    case "recurring-invoices":
      return Array.isArray(summary.failed) && summary.failed.length > 0;
    default:
      return false;
  }
}

function formatNextRun(date: Date) {
  // Compare calendar dates (UTC midnight boundaries), not raw elapsed
  // milliseconds — a run 20 hours away can still be "tomorrow" if it
  // crosses midnight, which a plain (target - now) / 86400000 floor gets
  // wrong (e.g. 08:00 tomorrow, checked at 09:15 today, is 22h45m away —
  // under 24h, but very much not today).
  const now = new Date();
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startOfTarget = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dayDiff = Math.round((startOfTarget - startOfToday) / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  if (dayDiff <= 0) return `today at ${time} UTC`;
  if (dayDiff === 1) return `tomorrow at ${time} UTC`;
  return `${date.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" })} at ${time} UTC`;
}

// Portal redesign Stage 5 — the "genuine automation-status view" the brief
// asked for. Until this stage none of the 6 cron jobs left any record of
// running at all (see cron-runs schema + record-cron-run.ts, wired into
// every /api/cron/* route this session) — so "Waiting" here specifically
// means "hasn't run since this feature shipped," not "broken." A true
// "Running" state isn't modelled: every one of these is a single
// synchronous serverless invocation lasting seconds, not a long-lived job
// — there's nothing real to observe between "triggered" and "finished."
export default async function AutomationPage() {
  const supabase = getSupabaseAdmin();

  const { data: allRuns } = supabase
    ? await supabase
        .from("cron_runs")
        .select("id, cron_name, status, summary, error, created_at")
        .in(
          "cron_name",
          CRON_SPECS.map((s) => s.name)
        )
        .order("created_at", { ascending: false })
        .limit(120)
    : { data: [] };

  const runsByCron = new Map<string, CronRun[]>();
  for (const run of (allRuns ?? []) as CronRun[]) {
    const list = runsByCron.get(run.cron_name) ?? [];
    if (list.length < 5) list.push(run);
    runsByCron.set(run.cron_name, list);
  }

  return (
    <div>
      <h1 className="text-page-title">Automation</h1>
      <p className="text-page-subtitle mt-1">
        Status of every scheduled job — what ran, when, and whether it needs a look.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {CRON_SPECS.map((spec) => {
          const runs = runsByCron.get(spec.name) ?? [];
          const latest = runs[0];
          const attention = latest?.status === "success" && needsAttention(spec.name, latest.summary);

          const state = !latest
            ? { label: "Waiting", variant: "outline" as const, icon: Clock }
            : latest.status === "error"
              ? { label: "Failed", variant: "destructive" as const, icon: XCircle }
              : attention
                ? { label: "Needs attention", variant: "warning" as const, icon: AlertTriangle }
                : { label: "Completed", variant: "success" as const, icon: CheckCircle2 };
          const StateIcon = state.icon;

          return (
            <Card key={spec.name}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                  <span>{spec.label}</span>
                  <Badge variant={state.variant} className="gap-1">
                    <StateIcon className="size-3" />
                    {state.label}
                  </Badge>
                </CardTitle>
                <CardDescription>{spec.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Last run</span>
                  <span className="text-foreground">{latest ? timeAgo(latest.created_at) : "Never yet"}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Next run</span>
                  <span className="text-foreground">{formatNextRun(spec.nextRun())}</span>
                </div>

                {latest?.status === "error" && latest.error && (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
                    {latest.error}
                  </p>
                )}
                {attention && latest?.summary && (
                  <p className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-warning">
                    {summaryHeadline(spec.name, latest.summary)}
                  </p>
                )}

                {runs.length > 1 && (
                  <details>
                    <summary className="cursor-pointer text-muted-foreground select-none hover:text-foreground">
                      Recent runs ({runs.length})
                    </summary>
                    <ul className="mt-2 space-y-1 border-l border-border pl-3">
                      {runs.map((run) => (
                        <li key={run.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                          <span className={run.status === "error" ? "text-destructive" : ""}>
                            {run.status === "error" ? "Failed" : "Completed"}
                          </span>
                          <span>{timeAgo(run.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// One short line explaining *why* a completed run is flagged — the same
// summary shape each cron already returns to its own JSON response, just
// translated into a sentence instead of raw fields.
function summaryHeadline(cronName: string, summary: Record<string, unknown>): string {
  switch (cronName) {
    case "self-check":
      return Array.isArray(summary.reasons) && summary.reasons.length ? summary.reasons.join(", ") : "Flagged an issue.";
    case "site-checks":
      return `${summary.flagged ?? 0} client site(s) flagged, ${summary.checkFailures ?? 0} check(s) failed to run.`;
    case "lead-discovery":
      return `${summary.searchFailures ?? 0} of ${summary.pairsSearched ?? "?"} searches failed.`;
    case "recurring-invoices":
      return Array.isArray(summary.failed) ? `${summary.failed.length} invoice(s) failed to create.` : "Some invoices failed to create.";
    default:
      return "Needs a look.";
  }
}
