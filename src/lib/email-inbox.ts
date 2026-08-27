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
// and `spf=pass` (per the backlog item's own framing) and fails closed —
// absent, malformed, or ambiguous (anything other than an explicit double
// pass) all return false, i.e. "treat as unverified."
//
// Security Auditor re-verification (2026-08-27) of the tradeoff Lead
// Engineer flagged when this shipped: checking "*some* Authentication-
// Results header claims a double pass" is NOT equivalent to checking
// "Gmail's own verdict claims a double pass," and the gap is real, not
// theoretical. Confirmed against RFC 8601 itself (https://www.rfc-editor.org/rfc/rfc8601,
// §5 "Removing Existing Header Fields" and §7.1 "Forged Header Fields"):
// a receiving MTA is only REQUIRED to strip a pre-existing
// Authentication-Results header that claims, via its authserv-id, to be
// the MTA's *own* prior verdict (i.e. Gmail only has to strip a header
// impersonating "mx.google.com"). Nothing in the spec — and no confirmed
// evidence about Gmail's actual behaviour beyond that minimum — requires
// stripping a header carrying a different, attacker-chosen authserv-id.
// That means an attacker can freely append their own line to the raw
// message they send, e.g.:
//   Authentication-Results: attacker-controlled-host; dkim=pass; spf=pass
// which Gmail has no obligation to remove (it isn't impersonating Gmail),
// alongside Gmail's own genuine, failing verdict
// (`mx.google.com; dkim=fail; spf=fail`) for the real spoofed message.
// The old `.some()` check — scanning every Authentication-Results header
// for a pass, regardless of who wrote it — would find the attacker's
// fabricated line and wrongly return true. RFC 8601 §7.1 states this
// exact risk in as many words and recommends trusting only a header field
// "explicit list of hostnames" known to be the real receiving server —
// exactly the authserv-id check added below.
//
// Fix: only a header whose authserv-id (the token before the first `;`,
// per RFC 8601 §2.5) is a known Gmail identity is trusted; anything else —
// however convincing — is ignored outright, not partially trusted. Per
// Google's own documentation this is consistently `mx.google.com` for
// Gmail's receiving MTA, for both personal Gmail and Google Workspace
// mailboxes (the account wired up here, per .env.example, is a Google
// Workspace integration). This has not yet been confirmed against a real,
// fetched production header from this specific mailbox — flagged here
// rather than guessed past silently. If a real header is ever observed
// with a different Gmail authserv-id, add it to TRUSTED_AUTHSERV_IDS
// rather than loosening the match.
const TRUSTED_AUTHSERV_IDS = new Set(["mx.google.com"]);

function extractAuthservId(headerValue: string): string | null {
  const beforeFirstSemicolon = headerValue.split(";")[0]?.trim() ?? "";
  if (!beforeFirstSemicolon) return null;
  // authserv-id may be followed by an optional whitespace-separated
  // authres-version token (RFC 8601 §2.5, e.g. "mx.google.com 1") — only
  // the first whitespace-delimited token is the identity itself.
  const token = beforeFirstSemicolon.split(/\s+/)[0];
  return token ? token.toLowerCase() : null;
}

export function isAuthenticatedSender(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined | null
): boolean {
  if (!headers) return false;

  const authResultsHeaders = headers.filter((h) => h.name?.toLowerCase() === "authentication-results");
  if (authResultsHeaders.length === 0) return false;

  return authResultsHeaders.some((h) => {
    const value = h.value ?? "";

    // Reject outright, don't half-trust: a header whose authserv-id isn't a
    // known Gmail identity did not come from Gmail's own authentication
    // check and carries no signal at all, no matter what it claims.
    const authservId = extractAuthservId(value);
    if (!authservId || !TRUSTED_AUTHSERV_IDS.has(authservId)) return false;

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
