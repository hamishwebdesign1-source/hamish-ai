import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { triageRequest } from "@/lib/triage-request";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  { id: "all", label: "All" },
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

  const admin = getSupabaseAdmin();
  if (!admin) redirect("/portal/login");

  const { data: client } = await admin.from("clients").select("id").eq("email", user.email).single();
  if (!client) redirect("/portal/login");

  const { data: allRequests } = await admin
    .from("requests")
    .select("id, raw_text, status, category, missing_info, created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const requests =
    statusFilter && statusFilter !== "all" ? allRequests?.filter((r) => r.status === statusFilter) : allRequests;

  const requestIds = (allRequests ?? []).map((r) => r.id);
  const { data: tasks } = requestIds.length
    ? await admin.from("tasks").select("id, request_id, title, status").in("request_id", requestIds)
    : { data: [] };

  const submitRequestWithId = submitRequest.bind(null, client.id);

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Requests</h1>
      <p className="mt-1 text-sm text-muted-foreground">Everything you've sent us, and what's happening with it.</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Submit a new request</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Tell us what you need — a change, a question, anything.</p>
          <form action={submitRequestWithId} className="mt-4 space-y-3">
            <Textarea name="raw_text" required rows={4} placeholder="What can we help with?" />
            <Button type="submit" className="w-full">
              Send
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const count =
            f.id === "all" ? allRequests?.length ?? 0 : allRequests?.filter((r) => r.status === f.id).length ?? 0;
          const active = (statusFilter ?? "all") === f.id;
          return (
            <Link key={f.id} href={f.id === "all" ? "/portal/requests" : `/portal/requests?status=${f.id}`}>
              <Badge variant={active ? "default" : "outline"}>
                {f.label} ({count})
              </Badge>
            </Link>
          );
        })}
      </div>

      {!requests?.length && (
        <p className="mt-6 text-sm text-muted-foreground">
          {statusFilter && statusFilter !== "all" ? "No requests in this category." : "Nothing yet — submit your first request above."}
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
