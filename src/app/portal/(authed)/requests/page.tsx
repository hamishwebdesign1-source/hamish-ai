import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getPortalMembership } from "@/lib/portal-membership";
import { triageRequest } from "@/lib/triage-request";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { RequestStatusBadge, TaskStatusBadge } from "@/components/status-badges";

async function submitRequest(clientId: string, formData: FormData) {
  "use server";
  const rawText = String(formData.get("raw_text") || "").trim();
  if (!rawText) return;

  const result = await triageRequest(clientId, rawText);
  if ("error" in result) {
    console.error("Portal request submission failed:", result.error);
  }

  revalidatePath("/portal/requests");
  revalidatePath("/portal");
}

const STATUS_FILTERS = [
  { id: "awaiting_info", label: "Needs your input" },
  { id: "triaged", label: "In progress" },
  { id: "new", label: "Received" },
] as const;

export default async function PortalRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusFilter } = await searchParams;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const membership = await getPortalMembership(supabase, user.email);
  if (!membership) redirect("/portal/login");
  const clientId = membership.clientId;

  const { data: allRequests } = await supabase
    .from("requests")
    .select("id, raw_text, status, category, missing_info, created_at, responded_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  const requests = statusFilter ? allRequests?.filter((r) => r.status === statusFilter) : allRequests;

  // Studio improvement — a real, honest response-time expectation instead
  // of a raw status. Scoped to this client's own history only (same RLS/
  // query boundary this whole page already operates within, and the
  // honest number to show anyway — "how fast has HamishAI/this agency
  // replied to ME," not a pooled figure across other clients this
  // session can't see). MIN_RESPONDED_FOR_AVERAGE=3 guards against a
  // misleading average from one or two data points, same "don't draw a
  // conclusion from too little signal" reasoning as studio-insights.ts's
  // own MIN_CALLS_FOR_AI_INSIGHT.
  const MIN_RESPONDED_FOR_AVERAGE = 3;
  const respondedRequests = (allRequests ?? []).filter((r) => r.responded_at);
  const averageResponseHours =
    respondedRequests.length >= MIN_RESPONDED_FOR_AVERAGE
      ? respondedRequests.reduce((sum, r) => sum + (new Date(r.responded_at!).getTime() - new Date(r.created_at).getTime()), 0) /
        respondedRequests.length /
        (1000 * 60 * 60)
      : null;
  const averageResponseLabel =
    averageResponseHours === null
      ? null
      : averageResponseHours < 1
        ? "under an hour"
        : averageResponseHours < 24
          ? `about ${Math.round(averageResponseHours)} hour${Math.round(averageResponseHours) === 1 ? "" : "s"}`
          : `about ${Math.round(averageResponseHours / 24)} day${Math.round(averageResponseHours / 24) === 1 ? "" : "s"}`;

  const requestIds = (allRequests ?? []).map((r) => r.id);
  const { data: tasks } = requestIds.length
    ? await supabase.from("tasks").select("id, request_id, title, status").in("request_id", requestIds)
    : { data: [] };

  const submitRequestWithId = submitRequest.bind(null, clientId);

  return (
    <div>
      <h1 className="text-page-title">Requests</h1>
      <p className="text-page-subtitle mt-1">Everything you&apos;ve sent us, and what&apos;s happening with it.</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Submit a new request</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Tell us what you need — a change, a question, anything.
            {averageResponseLabel && ` We typically reply within ${averageResponseLabel}, based on your own request history with us.`}
          </p>
          <form action={submitRequestWithId} className="mt-4 space-y-3">
            <Textarea name="raw_text" required rows={4} placeholder="What can we help with?" />
            <Button type="submit" className="w-full">
              Send
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8">
        <FilterTabs
          activeKey={statusFilter}
          options={[
            { key: undefined, label: "All", count: allRequests?.length ?? 0, href: "/portal/requests" },
            ...STATUS_FILTERS.map((f) => ({
              key: f.id,
              label: f.label,
              count: allRequests?.filter((r) => r.status === f.id).length ?? 0,
              href: `/portal/requests?status=${f.id}`,
            })),
          ]}
        />
      </div>

      {!requests?.length && (
        <p className="mt-6 text-sm text-muted-foreground">
          {statusFilter ? "No requests in this category." : "Nothing yet — submit your first request above."}
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {requests?.map((r) => {
          const linkedTasks = tasks?.filter((t) => t.request_id === r.id) ?? [];
          return (
            <li key={r.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium">{r.raw_text}</p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="mt-1.5">
                <RequestStatusBadge status={r.status} />
              </div>
              {r.missing_info?.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {r.missing_info.map((q: string, i: number) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              )}
              {linkedTasks.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {linkedTasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {t.title}
                      <TaskStatusBadge status={t.status} />
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
