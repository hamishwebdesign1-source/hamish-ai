import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendClientEmail } from "@/lib/send-client-email";
import { sendOrgEmail } from "@/lib/send-org-email";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { logInfo, logError } from "@/lib/structured-log";

// Creates a real Stripe invoice and emails the client a link to pay it —
// collection_method "send_invoice" rather than charging a saved card
// automatically, since new clients won't have one on file and this needs
// a human decision to trigger, not an auto-charge.
//
// The email itself goes via our own Resend-based sendClientEmail rather
// than Stripe's built-in invoice email (stripe.invoices.sendInvoice):
// Stripe's Sandbox test environment rejects that call outright ("cannot
// be sent right now"), and sending it ourselves means the email matches
// the sender's voice instead of Stripe's generic template anyway.
//
// Tenant billing (stripe-connect.ts): every Stripe call below takes a
// second `options` argument — `{ stripeAccount: id }` when the caller is
// a Connect-onboarded tenant, omitted entirely for HamishAI's own
// internal invoicing (undefined = the platform's own account, current
// behaviour unchanged). This is what actually routes the money to the
// tenant's own bank account instead of HamishAI's — the org_id column
// fix alone would only have fixed attribution in our own database, not
// where the cash lands.
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
    .select("id, business_name, email, stripe_customer_id, org_id")
    .eq("id", params.clientId)
    .single();

  if (clientError || !client) return { error: "Client not found." as const };
  if (!client.email) {
    return { error: "This client has no email on file — needed to send the invoice." as const };
  }

  // Same sender-resolution pattern as triage-request.ts, extended with
  // the Connect account a tenant's invoices must actually be created
  // under. A tenant with no connected account, or one that hasn't
  // finished Stripe's own onboarding yet, can't invoice at all —
  // deliberately hard-stopped here rather than silently falling back to
  // the platform account, which would recreate exactly the
  // money-goes-to-the-wrong-place problem this whole change exists to
  // avoid.
  let sender: { name: string; isInternal: boolean; replyToEmail: string | null } = { name: "Hamish AI", isInternal: true, replyToEmail: null };
  let stripeAccountId: string | undefined;
  if (client.org_id) {
    const { data: org } = await supabase
      .from("organisations")
      .select("name, is_internal, brand, stripe_connect_account_id, stripe_connect_charges_enabled")
      .eq("id", client.org_id)
      .single();
    if (org && !org.is_internal) {
      // Roadmap item #1 (send-org-email.ts) closed the gap this
      // function's own comment used to flag below ("sendClientEmail has
      // no per-tenant identity") — a tenant with a configured reply-to
      // email now gets a real invoice email under their own name too,
      // not just their client's clean Stripe hosted-invoice link.
      const replyToEmail = (org.brand as { replyToEmail?: string } | null)?.replyToEmail ?? null;
      sender = { name: org.name, isInternal: false, replyToEmail };
      if (!org.stripe_connect_account_id || !org.stripe_connect_charges_enabled) {
        return { error: "Connect your Stripe account in Settings before invoicing clients." as const };
      }
      stripeAccountId = org.stripe_connect_account_id;
    }
  }
  const stripeOptions = stripeAccountId ? { stripeAccount: stripeAccountId } : undefined;

  let stripeCustomerId = client.stripe_customer_id as string | null;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create(
      {
        email: client.email,
        name: client.business_name,
      },
      stripeOptions
    );
    stripeCustomerId = customer.id;
    await supabase.from("clients").update({ stripe_customer_id: stripeCustomerId }).eq("id", client.id);
  }

  try {
    await stripe.invoiceItems.create(
      {
        customer: stripeCustomerId,
        amount: params.amountPence,
        currency: "gbp",
        description: params.description,
      },
      stripeOptions
    );

    const invoice = await stripe.invoices.create(
      {
        customer: stripeCustomerId,
        collection_method: "send_invoice",
        days_until_due: 14,
        auto_advance: false,
      },
      stripeOptions
    );

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id, {}, stripeOptions);

    const { error: insertError } = await supabase.from("invoices").insert({
      client_id: params.clientId,
      // Same fix as requests.org_id — this column defaults to HamishAI's
      // own org id (schema-backfill-internal-org.sql) and was never being
      // set explicitly, meaning every invoice would otherwise misattribute
      // on this column regardless of whose client it was actually for.
      org_id: client.org_id ?? null,
      request_id: params.requestId ?? null,
      stripe_invoice_id: finalized.id,
      stripe_hosted_invoice_url: finalized.hosted_invoice_url,
      amount_pence: params.amountPence,
      description: params.description,
      status: "open",
      due_date: finalized.due_date ? new Date(finalized.due_date * 1000).toISOString().slice(0, 10) : null,
    });

    if (insertError) {
      logError("invoice.save_record_failed", { client_id: params.clientId, stripe_invoice_id: finalized.id, message: insertError.message });
    } else {
      logInfo("invoice.created", { client_id: params.clientId, stripe_invoice_id: finalized.id, amount_pence: params.amountPence });
    }

    // Was gated to isInternal only, with a comment claiming that was
    // "moot in practice since this function isn't reachable for a
    // tenant's client at all" — found stale while working nearby: it *is*
    // reachable, via createClientInvoice() (studio/clients/actions.ts),
    // wired to the InvoiceForm every tenant's own Clients page shows.
    // Roadmap item #1 (send-org-email.ts) is what actually closes the gap
    // the old comment was really describing — a tenant with a configured
    // reply-to email now gets a real invoice email under their own name;
    // one without still just gets the clean Stripe hosted-invoice link
    // and no separate email, same fail-closed-not-guessed rule as
    // sendInvoiceReminder()/monthly-report.ts.
    if (finalized.hosted_invoice_url) {
      const amountPounds = (params.amountPence / 100).toFixed(2);
      if (sender.isInternal) {
        await sendClientEmail(
          client.email,
          `Invoice from Hamish AI — £${amountPounds}`,
          `Hi,\n\nHere's an invoice for £${amountPounds}: ${params.description}\n\nYou can view and pay it securely here:\n${finalized.hosted_invoice_url}\n\nDue within 14 days. Let me know if you have any questions.\n\n— Hamish AI`
        );
      } else if (sender.replyToEmail) {
        await sendOrgEmail({
          orgId: client.org_id ?? "",
          orgName: sender.name,
          replyToEmail: sender.replyToEmail,
          to: client.email,
          subject: `Invoice from ${sender.name} — £${amountPounds}`,
          text: `Hi,\n\nHere's an invoice for £${amountPounds}: ${params.description}\n\nYou can view and pay it securely here:\n${finalized.hosted_invoice_url}\n\nDue within 14 days. Let me know if you have any questions.\n\n— ${sender.name}`,
        });
      }
    }

    return { invoiceUrl: finalized.hosted_invoice_url as string | null };
  } catch (error) {
    logError("invoice.create_failed", { client_id: params.clientId, amount_pence: params.amountPence, message: error instanceof Error ? error.message : String(error) });
    await sendErrorAlert(
      "Invoice creation",
      `Failed to create a Stripe invoice for ${client.business_name} (${params.amountPence / 100} GBP): ${error}`
    );
    return { error: "Failed to create the invoice via Stripe." as const };
  }
}
