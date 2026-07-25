import { getSupabaseAdmin } from "@/lib/supabase";
import { sendClientEmail } from "@/lib/send-client-email";

// Deliberately a fixed template, not an AI draft like the lead-outreach
// emails — this is a short factual nudge ("it's overdue, here's the
// link"), not a personalized pitch, so generation would add cost and
// risk without adding anything a client needs.
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
    .select("email, business_name")
    .eq("id", invoice.client_id)
    .single();
  if (!client?.email) return { error: "This client has no email on file." as const };

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
