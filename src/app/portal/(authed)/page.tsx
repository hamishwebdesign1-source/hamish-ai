import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { triageRequest } from "@/lib/triage-request";

const statusLabels: Record<string, string> = {
  new: "Received",
  awaiting_info: "We need a bit more info from you",
  triaged: "In progress",
};

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
        <div className="mt-6 rounded-xl border border-border bg-secondary/40 p-5">
          <p className="font-mono text-xs font-medium tracking-wide text-accent uppercase">Website health</p>
          <p className="mt-2 text-sm">{latestCheck.ai_summary}</p>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-border p-5">
        <h2 className="font-heading text-lg font-medium">Submit a new request</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tell us what you need — a change, a question, anything.
        </p>
        <form action={submitRequestWithId} className="mt-4 space-y-3">
          <textarea
            name="raw_text"
            required
            rows={5}
            placeholder="What can we help with?"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <button
            type="submit"
            className="h-9 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Send
          </button>
        </form>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-medium">Your requests</h2>
        {!requests?.length && (
          <p className="mt-3 text-sm text-muted-foreground">Nothing yet — submit your first request above.</p>
        )}
        <ul className="mt-4 space-y-3">
          {requests?.map((r) => {
            const linkedTasks = tasks?.filter((t) => t.request_id === r.id) ?? [];
            return (
              <li key={r.id} className="rounded-lg border border-border bg-background p-4">
                <p className="text-sm font-medium">{r.raw_text}</p>
                <p className="mt-1 text-xs font-medium text-accent">{statusLabels[r.status] || r.status}</p>
                {r.missing_info?.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                    {r.missing_info.map((q: string, i: number) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                )}
                {linkedTasks.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {linkedTasks.map((t) => (
                      <span
                        key={t.id}
                        className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground uppercase"
                      >
                        {t.title}: {t.status.replace("_", " ")}
                      </span>
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
