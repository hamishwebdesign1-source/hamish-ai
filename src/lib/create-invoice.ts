import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendClientEmail } from "@/lib/send-client-email";

// Creates a real Stripe invoice and emails the client a link to pay it —
// collection_method "send_invoice" rather than charging a saved card
// automatically, since new clients won't have one on file and this needs
// a human decision (Hamish) to trigger, not an auto-charge.
//
// The email itself goes via our own Resend-based sendClientEmail rather
// than Stripe's built-in invoice email (stripe.invoices.sendInvoice):
// Stripe's Sandbox test environment rejects that call outright ("cannot
// be sent right now"), and sending it ourselves means the email matches
// Hamish's voice instead of Stripe's generic template anyway.
export async function createInvoice(params: {
  clientId: string;
  amountPence: number;
  description: string;
  requestId?: string;
}) {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe is not configured." as const };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, business_name, email, stripe_customer_id")
    .eq("id", params.clientId)
    .single();

  if (clientError || !client) return { error: "Client not found." as const };
  if (!client.email) {
    return { error: "This client has no email on file — needed to send the invoice." as const };
  }

  let stripeCustomerId = client.stripe_customer_id as string | null;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: client.email,
      name: client.business_name,
    });
    stripeCustomerId = customer.id;
    await supabase.from("clients").update({ stripe_customer_id: stripeCustomerId }).eq("id", client.id);
  }

  try {
    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      amount: params.amountPence,
      currency: "gbp",
      description: params.description,
    });

    const invoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      collection_method: "send_invoice",
      days_until_due: 14,
      auto_advance: false,
    });

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

    const { error: insertError } = await supabase.from("invoices").insert({
      client_id: params.clientId,
      request_id: params.requestId ?? null,
      stripe_invoice_id: finalized.id,
      stripe_hosted_invoice_url: finalized.hosted_invoice_url,
      amount_pence: params.amountPence,
      description: params.description,
      status: "open",
      due_date: finalized.due_date ? new Date(finalized.due_date * 1000).toISOString().slice(0, 10) : null,
    });

    if (insertError) console.error("Failed to save invoice record:", insertError);

    if (finalized.hosted_invoice_url) {
      const amountPounds = (params.amountPence / 100).toFixed(2);
      await sendClientEmail(
        client.email,
        `Invoice from Hamish AI — £${amountPounds}`,
        `Hi,\n\nHere's an invoice for £${amountPounds}: ${params.description}\n\nYou can view and pay it securely here:\n${finalized.hosted_invoice_url}\n\nDue within 14 days. Let me know if you have any questions.\n\n— Hamish AI`
      );
    }

    return { invoiceUrl: finalized.hosted_invoice_url as string | null };
  } catch (error) {
    console.error("Failed to create Stripe invoice:", error);
    return { error: "Failed to create the invoice via Stripe." as const };
  }
}
