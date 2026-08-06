import { google, type gmail_v1 } from "googleapis";
import { getGoogleAuthClient } from "@/lib/google-auth";
import { siteConfig } from "@/lib/site-config";

// Creates a real Gmail draft (via the Gmail API, using the same
// gmail.modify OAuth scope already granted for the inbox cron — no new
// consent needed) instead of the old mail.google.com/?view=cm compose-URL
// trick. Two things that trick couldn't do, that this can:
//   1. Gmail's account-level signature is never inserted when a compose
//      window is opened with a pre-filled `body` param — so this builds
//      the HTML signature directly into the message instead.
//   2. There's no way to know afterwards whether a compose-URL tab was
//      ever actually sent. A created draft has a stable underlying
//      message id that transitions from the DRAFT label to the SENT
//      label the moment it's really sent — see checkDraftSendStatus.
//
// Still never auto-sends anything — this creates a draft sitting in the
// operator's own Drafts folder, same as before, just server-built instead
// of client-composed.

const SIGNATURE_HTML = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin-top:24px;">
  <tr>
    <td style="padding-right:16px;vertical-align:top;">
      <img src="https://hamishai.org/icon.svg" width="52" height="52" alt="Hamish AI" style="display:block;border-radius:11px;border:0;" />
    </td>
    <td style="vertical-align:top;border-left:2px solid #0a73f3;padding-left:16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="font-size:16px;font-weight:bold;color:#0e1624;line-height:1.3;padding-bottom:2px;">Hamish McFarlane</td></tr>
        <tr><td style="font-size:13px;color:#5b6472;line-height:1.4;padding-bottom:10px;">
          Founder — <a href="https://hamishai.org" style="color:#0a73f3;text-decoration:none;font-weight:bold;">Hamish AI</a>
          &nbsp;&middot;&nbsp; AI automation &amp; websites for Edinburgh businesses
        </td></tr>
        <tr><td style="border-top:1px solid #d6dbe1;font-size:0;line-height:0;padding-top:10px;">&nbsp;</td></tr>
        <tr><td style="font-size:13px;color:#5b6472;line-height:2;padding-top:8px;">
          <a href="tel:+447949674994" style="color:#5b6472;text-decoration:none;">${siteConfig.phone}</a>
          <span style="color:#d6dbe1;">&nbsp;|&nbsp;</span>
          <a href="mailto:${siteConfig.email}" style="color:#5b6472;text-decoration:none;">${siteConfig.email}</a>
          <br/>
          <a href="https://hamishai.org" style="color:#0a73f3;text-decoration:none;">hamishai.org</a>
          <span style="color:#d6dbe1;">&nbsp;|&nbsp;</span>
          <a href="${siteConfig.linkedin}" style="color:#0a73f3;text-decoration:none;">LinkedIn</a>
        </td></tr>
      </table>
    </td>
  </tr>
</table>`;

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function bodyToHtmlParagraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 14px;">${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRawMessage({ to, subject, textBody }: { to: string; subject: string; textBody: string }) {
  const boundary = `hamishai_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const htmlBody = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0e1624;line-height:1.6;">${bodyToHtmlParagraphs(textBody)}${SIGNATURE_HTML}</div>`;

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    // textBody already ends with its own plain sign-off (see
    // SIGN_OFF_INSTRUCTION in draft-lead-email.ts) — not duplicated here.
    textBody,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    htmlBody,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return base64UrlEncode(message);
}

export async function createLeadGmailDraft({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ draftId: string; messageId: string } | { error: string }> {
  const auth = getGoogleAuthClient();
  if (!auth) return { error: "Google (Gmail) is not configured." };

  const gmail = google.gmail({ version: "v1", auth });
  const raw = buildRawMessage({ to, subject, textBody: body });

  try {
    const { data } = await gmail.users.drafts.create({
      userId: "me",
      requestBody: { message: { raw } },
    });
    if (!data.id || !data.message?.id) return { error: "Gmail didn't return a draft id." };
    return { draftId: data.id, messageId: data.message.id };
  } catch (error) {
    console.error("Failed to create Gmail draft:", error);
    return { error: "Failed to create the Gmail draft." };
  }
}

export type DraftSendStatus = "sent" | "pending" | "gone";

// The definitive "was it actually sent" check: a draft's underlying
// message id is stable across the transition from draft to sent (Gmail
// just swaps the DRAFT label for SENT on the same message) — unlike the
// draft id itself, which stops resolving the moment it's sent OR
// deleted, so checking the draft id alone can't tell those two apart.
export async function checkDraftSendStatus(gmail: gmail_v1.Gmail, messageId: string): Promise<DraftSendStatus> {
  try {
    const { data } = await gmail.users.messages.get({ userId: "me", id: messageId, format: "minimal" });
    if (data.labelIds?.includes("SENT")) return "sent";
    return "pending";
  } catch (error: unknown) {
    const status = (error as { code?: number; response?: { status?: number } })?.code ?? (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) return "gone";
    console.error(`Failed to check send status for message ${messageId}:`, error);
    return "pending";
  }
}
