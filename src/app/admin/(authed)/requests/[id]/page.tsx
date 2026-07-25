import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleHelp, Sparkles } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { updateTaskStatus, updateDraftResponse } from "@/app/admin/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/status-badges";

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
        <Link
          href={`/admin/clients/${client.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {client.business_name}
        </Link>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {req.priority && <PriorityBadge priority={req.priority} />}
        {req.category && <Badge variant="outline">{req.category}</Badge>}
        {req.complexity && <Badge variant="outline">{req.complexity}</Badge>}
        <Badge variant="outline">{req.status}</Badge>
      </div>

      <Card className="mt-5 bg-secondary/40">
        <CardHeader>
          <p className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Original request
          </p>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-line">{req.raw_text}</p>
        </CardContent>
      </Card>

      {req.missing_info?.length > 0 && (
        <Card className="mt-6 border-warning/30 bg-warning/10">
          <CardHeader>
            <p className="flex items-center gap-1.5 font-mono text-xs font-medium tracking-wide text-warning uppercase">
              <CircleHelp className="size-3.5" />
              Ask the client this before proceeding
            </p>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {req.missing_info.map((q: string, i: number) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Maintenance coverage
            </p>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-lg font-semibold">
              {req.covered_by_maintenance ? "Covered" : "Not covered — new scope"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{req.coverage_reasoning}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Suggested approach
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{req.suggested_approach}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <p className="font-mono text-xs font-medium tracking-wide text-accent uppercase">Draft response to send</p>
        <form action={updateDraftResponse.bind(null, req.id)} className="mt-2 space-y-2">
          <Textarea name="draft_response" defaultValue={req.draft_response} rows={6} />
          <Button type="submit" variant="outline" size="sm">
            Save draft
          </Button>
        </form>
      </div>

      {tasks && tasks.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <p className="flex items-center gap-1.5 font-mono text-xs font-medium tracking-wide uppercase" style={{ color: "var(--gradient-violet)" }}>
              <Sparkles className="size-3.5" />
              Suggested task
            </p>
          </CardHeader>
          <CardContent>
            {tasks.map((t) => (
              <div key={t.id} className="mt-2 first:mt-0">
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
                      <Button
                        type="submit"
                        size="xs"
                        variant={t.status === status ? "default" : "outline"}
                        className="capitalize"
                      >
                        {status.replace("_", " ")}
                      </Button>
                    </form>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
