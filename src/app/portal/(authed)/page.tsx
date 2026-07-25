import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { HeartPulse } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { triageRequest } from "@/lib/triage-request";
import { AskSupportAgent } from "@/components/portal/ask-support-agent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RequestStatusBadge, TaskStatusBadge } from "@/components/status-badges";

async function submitRequest(clientId: string, formData: FormData) {
  "use server";
  const rawText = String(formData.get("raw_text") || "").trim();
  if (!rawText) return;

  const result = await triageRequest(clientId, rawText);
  if ("error" in result) {
    console.error("Portal request submission failed:", result.error);
  }

  revalidatePath("/portal");
}

export default async function PortalHomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const admin = getSupabaseAdmin();
  if (!admin) redirect("/portal/login");

  const { data: client } = await admin.from("clients").select("*").eq("email", user.email).single();
  if (!client) redirect("/portal/login");

  const { data: requests } = await admin
    .from("requests")
    .select("id, raw_text, status, category, missing_info, created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: tasks } = requestIds.length
    ? await admin.from("tasks").select("id, request_id, title, status").in("request_id", requestIds)
    : { data: [] };

  const { data: siteChecks } = client.website_url
    ? await admin
        .from("site_checks")
        .select("ai_summary, checked_at")
        .eq("client_id", client.id)
        .order("checked_at", { ascending: false })
        .limit(1)
    : { data: [] };
  const latestCheck = siteChecks?.[0] ?? null;

  const submitRequestWithId = submitRequest.bind(null, client.id);

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Hi {client.name || client.business_name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{client.business_name}</p>

      {latestCheck?.ai_summary && (
        <Card className="mt-6 bg-secondary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 font-mono text-xs font-medium tracking-wide text-accent uppercase">
              <HeartPulse className="size-3.5" />
              Website health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{latestCheck.ai_summary}</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-8">
        <AskSupportAgent clientId={client.id} />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Submit a new request</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Tell us what you need — a change, a question, anything.</p>
          <form action={submitRequestWithId} className="mt-4 space-y-3">
            <Textarea name="raw_text" required rows={5} placeholder="What can we help with?" />
            <Button type="submit" className="w-full">
              Send
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-medium">Your requests</h2>
        {!requests?.length && (
          <p className="mt-3 text-sm text-muted-foreground">Nothing yet — submit your first request above.</p>
        )}
        <ul className="mt-4 space-y-3">
          {requests?.map((r) => {
            const linkedTasks = tasks?.filter((t) => t.request_id === r.id) ?? [];
            return (
              <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-medium">{r.raw_text}</p>
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
    </div>
  );
}
