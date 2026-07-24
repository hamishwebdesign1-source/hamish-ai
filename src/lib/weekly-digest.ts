import { getSupabaseAdmin } from "@/lib/supabase";
import { sendClientEmail } from "@/lib/send-client-email";

// Weekly close-the-loop digest — one email per client summarizing what's
// still open, so they don't have to remember to check the portal. Clients
// with nothing outstanding are skipped entirely; an empty "nothing to
// report" email is exactly the noise this feature exists to avoid.
export async function sendWeeklyDigests() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id, business_name, email")
    .not("email", "is", null);

  if (clientsError) return { error: "Failed to fetch clients." as const };

  const sent: string[] = [];

  for (const client of clients ?? []) {
    if (!client.email) continue;

    const { data: requests } = await supabase
      .from("requests")
      .select("id, raw_text, status, missing_info")
      .eq("client_id", client.id);

    const requestIds = (requests ?? []).map((r) => r.id);
    const awaitingInfo = (requests ?? []).filter((r) => r.status === "awaiting_info");

    const { data: openTasks } = requestIds.length
      ? await supabase.from("tasks").select("title, status").in("request_id", requestIds).neq("status", "done")
      : { data: [] };

    if (awaitingInfo.length === 0 && !openTasks?.length) continue;

    const sections: string[] = [];

    if (awaitingInfo.length > 0) {
      const lines = awaitingInfo
        .map((r) => `- "${r.raw_text}" — still waiting on: ${(r.missing_info ?? []).join(", ")}`)
        .join("\n");
      sections.push(`Still waiting on info from you:\n${lines}`);
    }

    if (openTasks?.length) {
      const lines = openTasks.map((t) => `- ${t.title} (${t.status.replace("_", " ")})`).join("\n");
      sections.push(`In progress:\n${lines}`);
    }

    await sendClientEmail(
      client.email,
      `Your weekly update — ${client.business_name}`,
      `Hi,\n\nHere's where things stand this week:\n\n${sections.join("\n\n")}\n\nLog into your portal any time for the full picture.\n\n— Hamish AI`
    );

    sent.push(client.business_name);
  }

  return { sent };
}
