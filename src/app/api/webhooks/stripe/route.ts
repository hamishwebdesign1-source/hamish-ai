import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { logInfo, logWarn, logError } from "@/lib/structured-log";

// Stripe's own callback when an invoice's status changes — verified via
// its signature header rather than the admin cookie (Stripe has no way
// to hold that), so this route deliberately sits outside the
// /api/internal/* matcher the auth middleware protects.
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();
  if (!webhookSecret || !stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    logWarn("stripe_webhook.signature_invalid", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  logInfo("stripe_webhook.received", { event_type: event.type, event_id: event.id });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });

  // Phase 3: a real Stripe subscription generates its own invoice every
  // cycle — unlike create-invoice.ts's one-off invoices, which insert
  // their own `invoices` row at creation time, a subscription's invoice
  // is born entirely inside Stripe. Without this, it would exist in
  // Stripe but stay invisible in the admin/portal billing views, which
  // read only from our own table. invoice.finalized is the first event
  // where hosted_invoice_url and due_date are actually populated.
  if (event.type === "invoice.finalized") {
    const invoice = event.data.object as Stripe.Invoice;
    const { data: existing } = await supabase.from("invoices").select("id").eq("stripe_invoice_id", invoice.id).maybeSingle();

    if (!existing && invoice.customer) {
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer.id;
      const { data: client } = await supabase.from("clients").select("id").eq("stripe_customer_id", customerId).single();

      if (client) {
        const { error } = await supabase.from("invoices").insert({
          client_id: client.id,
          stripe_invoice_id: invoice.id,
          stripe_hosted_invoice_url: invoice.hosted_invoice_url,
          amount_pence: invoice.amount_due,
          description: invoice.lines?.data?.[0]?.description ?? "Monthly maintenance",
          status: "open",
          due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString().slice(0, 10) : null,
        });
        if (error) {
          logError("stripe_webhook.invoice_record_failed", { stripe_invoice_id: invoice.id, client_id: client.id, message: error.message });
          await sendErrorAlert("Stripe webhook", `A subscription invoice (${invoice.id}) finalized but we failed to save it: ${error.message}`);
        } else {
          logInfo("stripe_webhook.subscription_invoice_recorded", { stripe_invoice_id: invoice.id, client_id: client.id, amount_pence: invoice.amount_due });
        }
      }
    }
  }

  // Subscription lifecycle -> subscription_status only. Deliberately not
  // the client's operational `status` (active/paused/churned) — that's an
  // admin offboarding decision, not something a payment hiccup should
  // silently flip. See schema-subscriptions.sql.
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const { error } = await supabase
      .from("clients")
      .update({ subscription_status: subscription.status })
      .eq("stripe_subscription_id", subscription.id);
    if (error) {
      logError("stripe_webhook.subscription_status_sync_failed", { stripe_subscription_id: subscription.id, message: error.message });
    } else {
      logInfo("stripe_webhook.subscription_status_synced", { stripe_subscription_id: subscription.id, status: subscription.status });
    }
  }

  // Only `.id` is read from the invoice payload below — that's present in
  // both "thin" (reference-only) and full-snapshot payload styles, so
  // this works regardless of which one the webhook endpoint is set to.
  const statusByEvent: Record<string, string> = {
    "invoice.paid": "paid",
    "invoice.voided": "void",
    "invoice.marked_uncollectible": "uncollectible",
    "invoice.payment_failed": "open",
  };

  const newStatus = statusByEvent[event.type];
  if (newStatus) {
    const invoice = event.data.object as Stripe.Invoice;
    const update: { status: string; paid_at?: string } = { status: newStatus };
    if (newStatus === "paid") update.paid_at = new Date().toISOString();

    const { error } = await supabase.from("invoices").update(update).eq("stripe_invoice_id", invoice.id);
    if (error) {
      logError("stripe_webhook.invoice_status_update_failed", { stripe_invoice_id: invoice.id, new_status: newStatus, message: error.message });
      await sendErrorAlert(
        "Stripe webhook",
        `Received a "${event.type}" event for invoice ${invoice.id} but failed to update our own record: ${error.message}`
      );
    } else {
      logInfo("stripe_webhook.invoice_status_updated", { stripe_invoice_id: invoice.id, new_status: newStatus });
    }
  }

  return NextResponse.json({ received: true });
}
