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

// Design note (backlog: "email-inbox.ts's inbound-triage matching is
// From-header-only — no spoofing check"): the Gmail search above matches
// purely on the From header, with no independent authenticity check. A
// convincingly spoofed email carrying a real client's address in From could
// otherwise reach triageRequest() and, if it clears the AI's own
// complexity/maintenance/priority gates, the unsupervised auto-send path —
// impersonating a real client to get HamishAI's own AI to auto-send a reply
// "on their behalf."
//
// What's actually available: `gmail.users.messages.get(..., { format:
// "full" })` (already called below, no extra API request needed) returns
// every header on the message, including `Authentication-Results` — the
// header Gmail's own receiving mail server appends recording its SPF/DKIM/
// DMARC verdicts for that message. This function requires both `dkim=pass`
// and `spf=pass` (per the backlog item's own framing) across any
// Authentication-Results header present, and fails closed — absent,
// malformed, or ambiguous (anything other than an explicit double pass) all
// return false, i.e. "treat as unverified."
//
// Known, deliberate limitation not fully resolved here: this checks that
// *some* Authentication-Results header claims a double pass, without
// verifying which mail server appended it (the trustworthy one is the
// receiving server's own, identified by its authserv-id before the first
// `;` — for personal Gmail this is consistently `mx.google.com`, but this
// wasn't verified against real production headers before shipping, per the
// backlog item's own open question). A message relayed through an
// intermediate hop could in principle carry an earlier, less trustworthy
// Authentication-Results header of its own. Flagged as a tradeoff for
// Security Auditor re-verification against real fetched headers, not
// guessed past silently — the safe default (fail closed on anything short
// of an explicit double pass) is applied regardless of this open question.
export function isAuthenticatedSender(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined | null
): boolean {
  if (!headers) return false;

  const authResultsHeaders = headers.filter((h) => h.name?.toLowerCase() === "authentication-results");
  if (authResultsHeaders.length === 0) return false;

  return authResultsHeaders.some((h) => {
    const value = h.value ?? "";
    const dkim = /(?:^|[\s;])dkim=(\w+)/i.exec(value)?.[1]?.toLowerCase();
    const spf = /(?:^|[\s;])spf=(\w+)/i.exec(value)?.[1]?.toLowerCase();
    return dkim === "pass" && spf === "pass";
  });
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

      // Fail closed on a spoofable From-header match — see
      // isAuthenticatedSender()'s own comment above. An unverified sender
      // still gets triaged and saved for a human to review in Studio;
      // it just never gets an unsupervised reply sent under Hamish's
      // identity based on content that couldn't be corroborated as
      // genuinely from this client.
      const verified = isAuthenticatedSender(full.payload?.headers);
      const result = await triageRequest(client.id, body, {
        forceHumanReview: !verified,
        forceHumanReviewReason: verified
          ? undefined
          : "Inbound email's From header could not be corroborated by an SPF+DKIM pass (Authentication-Results absent or failed).",
      });
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
