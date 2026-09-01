import { Resend } from "resend";
import { isRateLimited } from "@/lib/chat-rate-limit";
import { logAuditEvent } from "@/lib/audit-log";
import type { EmailAttachment } from "@/lib/send-client-email";

// Roadmap item #1 ("tenant-scoped outbound email") — the piece
// send-invoice-reminder.ts's and clients/actions.ts's own comments flag
// as the real blocker: sendClientEmail() only ever sends under HamishAI's
// own hardcoded "Hamish AI <hello@hamishai.org>" identity, so nothing
// built on it could safely go out to a *tenant's* client without visibly
// lying about who it's from.
//
// Deliberately NOT full white-label (a verified sending domain per org,
// platform-plans.ts's own "White-label add-on available once requested").
// That needs real per-tenant DNS verification through Resend's domain
// API — a bigger, on-demand build for whichever org actually asks, not
// something to build speculatively here. This solves the actual problem
// documented in the codebase today: a client-facing send needs to look
// like it came from the tenant, not HamishAI, and a reply needs to land
// in the tenant's own inbox, not ours. Both are true with a shared
// verified From domain plus a per-org display name and Reply-To:
//   From: "{Org name} via Hamish AI" <outreach@hamishai.org>
//   Reply-To: {the org's own support/reply email, set once in Settings}
//
// hamishai.org is already a Resend-verified sending domain (send-client-
// email.ts uses hello@ on it) — any local part on a verified domain sends
// the same way, so no new domain verification is needed for this.
export async function sendOrgEmail(params: {
  orgId: string;
  orgName: string;
  replyToEmail: string;
  to: string;
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
}): Promise<{ sent: true } | { error: string }> {
  const { orgId, orgName, replyToEmail, to, subject, text, attachments } = params;

  // Per-org bucket, separate from isStudioActionRateLimited's AI-call
  // budget — this is guarding real email deliverability/spend, not
  // Anthropic spend, so it gets its own key. 50/hour is generous for the
  // one-off, human-triggered sends this currently gates (payment
  // reminders); nothing here yet fires these in a loop.
  if (await isRateLimited(`org-email:${orgId}`, { windowSeconds: 60 * 60, maxRequests: 50 })) {
    return { error: "Too many emails sent recently — try again in a little while." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`Org email (RESEND_API_KEY not set, not sent) to ${to} from "${orgName} via Hamish AI": ${subject}\n${text}`);
  } else {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `${orgName} via Hamish AI <outreach@hamishai.org>`,
      to,
      replyTo: replyToEmail,
      subject,
      text,
      ...(attachments?.length ? { attachments } : {}),
    });
    if (error) {
      console.error(`Resend org email (org ${orgId}) to ${to} failed:`, error);
      return { error: "Failed to send the email." };
    }
  }

  // Fire-and-forget, same convention as every other admin-triggered send
  // in this codebase (audit-log.ts's own comment) — losing this entry to
  // a transient DB hiccup shouldn't mean the send itself is treated as
  // failed.
  logAuditEvent({
    actor: orgName,
    actorType: "system",
    action: "org_email_sent",
    targetType: "email",
    orgId,
    metadata: { orgId, to, subject },
  });

  return { sent: true };
}
