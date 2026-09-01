import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendClientEmail } from "@/lib/send-client-email";
import { sendOrgEmail } from "@/lib/send-org-email";

async function recordReminderSent(supabase: SupabaseClient, invoiceId: string) {
  const { error } = await supabase.from("invoices").update({ reminder_sent_at: new Date().toISOString() }).eq("id", invoiceId);
  if (error) console.error(`Failed to record reminder_sent_at for invoice ${invoiceId}:`, error);
}

// Deliberately a fixed template, not an AI draft like the lead-outreach
// emails — this is a short factual nudge ("it's overdue, here's the
// link"), not a personalized pitch, so generation would add cost and
// risk without adding anything a client needs.
//
// Sender gate added when this was wired into Studio's multi-tenant
// Engagement Risk card (backlog: "One-click 'Send payment reminder'…") —
// found, before that wiring shipped, that this function had none: it
// always emailed under sendClientEmail()'s hardcoded "Hamish AI
// <hello@hamishai.org>" identity, and always signed the body "— Hamish
// AI", regardless of whose client the invoice actually belonged to. That
// was harmless while the only caller was /admin (Hamish's own clients,
// always genuinely from Hamish), but would have been a real, visible
// identity leak the moment a tenant org used it on their own client —
// exactly the risk category create-invoice.ts's and triage-request.ts's
// own `sender.isInternal` gates already exist to close for every other
// client-facing send in this codebase.
//
// Roadmap item #1 (send-org-email.ts) closed the "no per-tenant identity"
// gap this comment originally described: a confirmed non-internal org
// now sends through sendOrgEmail() — its own name, a reply-to that lands
// in the org's own inbox — once it's actually configured one in Settings.
// Still fails closed (same refusal as before) for an org that hasn't set
// one yet, rather than guessing or falling back to HamishAI's identity.
export async function sendInvoiceReminder(invoiceId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, client_id, amount_pence, description, stripe_hosted_invoice_url, due_date, status")
    .eq("id", invoiceId)
    .single();
  if (error || !invoice) return { error: "Invoice not found." as const };
  if (invoice.status !== "open") return { error: "This invoice isn't awaiting payment." as const };

  const { data: client } = await supabase
    .from("clients")
    .select("email, business_name, org_id")
    .eq("id", invoice.client_id)
    .single();
  if (!client?.email) return { error: "This client has no email on file." as const };

  const amountPounds = (invoice.amount_pence / 100).toFixed(2);
  const dueDateLabel = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const bodyCore = `Just a friendly nudge — the invoice for £${amountPounds} (${invoice.description})${
    dueDateLabel ? ` was due ${dueDateLabel}` : ""
  } hasn't come through yet.\n\nYou can view and pay it securely here:\n${invoice.stripe_hosted_invoice_url}\n\nLet me know if anything's holding it up, or if you've already paid and this crossed over.`;
  const subject = `Reminder: invoice for £${amountPounds} is overdue`;

  // Same sender-resolution shape as create-invoice.ts: a client with no
  // org_id is a legacy pre-backfill HamishAI client (treated as internal,
  // matching resolveSender()'s own rule), otherwise branch on whether the
  // org is confirmed internal, has configured its own reply-to email, or
  // neither.
  if (client.org_id) {
    const { data: org } = await supabase.from("organisations").select("is_internal, name, brand").eq("id", client.org_id).single();
    // Same fail-closed shape as before this org-email branch existed: an
    // errored/missing lookup is treated exactly like a confirmed
    // non-internal org with nothing configured, not as some third state —
    // there is no safe identity to send under either way.
    if (!org?.is_internal) {
      const replyToEmail = (org?.brand as { replyToEmail?: string } | null)?.replyToEmail;
      if (!org || !replyToEmail) {
        return {
          error: "Set a reply-to email in Studio Settings first — that's what lets payment reminders go out under your own name.",
          reason: "tenant_email_unsupported" as const,
        };
      }
      const result = await sendOrgEmail({
        orgId: client.org_id,
        orgName: org.name,
        replyToEmail,
        to: client.email,
        subject,
        text: `Hi,\n\n${bodyCore}\n\n— ${org.name}`,
      });
      if ("error" in result) return { error: result.error };
      await recordReminderSent(supabase, invoiceId);
      return { sent: true as const };
    }
  }

  await sendClientEmail(client.email, subject, `Hi,\n\n${bodyCore}\n\n— Hamish AI`);
  await recordReminderSent(supabase, invoiceId);

  return { sent: true as const };
}
