import { getSupabaseAdmin } from "@/lib/supabase";
import { sendClientEmail } from "@/lib/send-client-email";

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
// client-facing send in this codebase. Same fix, same precedent, applied
// here rather than reinvented: refuse to send at all for a confirmed
// non-internal org, rather than sending under the wrong name. Real
// per-tenant email identity (a verified sending domain/reply-to per org)
// is a separate, larger piece of infrastructure this doesn't attempt.
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

  // Same sender-resolution shape as create-invoice.ts: a client with no
  // org_id is a legacy pre-backfill HamishAI client (treated as internal,
  // matching resolveSender()'s own rule), otherwise fail closed on
  // anything that isn't a *confirmed* internal org.
  if (client.org_id) {
    const { data: org } = await supabase.from("organisations").select("is_internal").eq("id", client.org_id).single();
    if (!org?.is_internal) {
      return {
        error: "Payment reminder emails aren't available yet for your own clients — this needs per-tenant email sending, which hasn't been built.",
        reason: "tenant_email_unsupported" as const,
      };
    }
  }

  const amountPounds = (invoice.amount_pence / 100).toFixed(2);
  const dueDateLabel = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  await sendClientEmail(
    client.email,
    `Reminder: invoice for £${amountPounds} is overdue`,
    `Hi,\n\nJust a friendly nudge — the invoice for £${amountPounds} (${invoice.description})${
      dueDateLabel ? ` was due ${dueDateLabel}` : ""
    } hasn't come through yet.\n\nYou can view and pay it securely here:\n${invoice.stripe_hosted_invoice_url}\n\nLet me know if anything's holding it up, or if you've already paid and this crossed over.\n\n— Hamish AI`
  );

  const { error: updateError } = await supabase
    .from("invoices")
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq("id", invoiceId);
  if (updateError) console.error(`Failed to record reminder_sent_at for invoice ${invoiceId}:`, updateError);

  return { sent: true as const };
}
