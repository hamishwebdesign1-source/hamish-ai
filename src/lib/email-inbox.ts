import { google, type gmail_v1 } from "googleapis";
import { getGoogleAuthClient } from "@/lib/google-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { triageRequest } from "@/lib/triage-request";

// Turns a client's real inbound emails into triaged requests automatically.
// Dedup is Gmail's own label, not just the processed_emails audit table —
// a message once labeled is never fetched by the search query again, so
// re-running the cron can never double-triage the same email.
const PROCESSED_LABEL = "HamishAI/Processed";

async function getOrCreateProcessedLabelId(gmail: gmail_v1.Gmail): Promise<string> {
  const { data } = await gmail.users.labels.list({ userId: "me" });
  const existing = data.labels?.find((l) => l.name === PROCESSED_LABEL);
  if (existing?.id) return existing.id;

  const { data: created } = await gmail.users.labels.create({
    userId: "me",
    requestBody: { name: PROCESSED_LABEL, labelListVisibility: "labelHide", messageListVisibility: "show" },
  });
  return created.id!;
}

function extractPlainText(part: gmail_v1.Schema$MessagePart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    return Buffer.from(part.body.data, "base64url").toString("utf-8");
  }
  for (const child of part.parts ?? []) {
    const text = extractPlainText(child);
    if (text) return text;
  }
  return "";
}

export async function checkEmailInbox() {
  const auth = getGoogleAuthClient();
  if (!auth) return { error: "Google inbox is not configured." as const };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const gmail = google.gmail({ version: "v1", auth });
  const labelId = await getOrCreateProcessedLabelId(gmail);

  const { data: clients } = await supabase
    .from("clients")
    .select("id, email, business_name")
    .eq("status", "active")
    .not("email", "is", null);

  const processed: { client: string; subject: string }[] = [];

  for (const client of clients ?? []) {
    if (!client.email) continue;

    const { data: listResult } = await gmail.users.messages.list({
      userId: "me",
      q: `from:${client.email} in:inbox -label:${labelId}`,
      maxResults: 10,
    });

    for (const msg of listResult.messages ?? []) {
      if (!msg.id) continue;

      const { data: full } = await gmail.users.messages.get({ userId: "me", id: msg.id, format: "full" });
      const body = extractPlainText(full.payload) || full.snippet || "";
      if (!body.trim()) continue;

      const subject = full.payload?.headers?.find((h) => h.name === "Subject")?.value ?? "(no subject)";

      const result = await triageRequest(client.id, body);
      if ("error" in result) {
        console.error(`Email-inbox triage failed for ${client.business_name}:`, result.error);
        continue;
      }

      await gmail.users.messages.modify({ userId: "me", id: msg.id, requestBody: { addLabelIds: [labelId] } });
      await supabase.from("processed_emails").insert({ message_id: msg.id, client_id: client.id, subject });

      processed.push({ client: client.business_name, subject });
    }
  }

  return { processed };
}
