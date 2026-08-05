import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { logInfo, logError } from "@/lib/structured-log";

// Every client's subscription shares this one Product (fixed, explicit
// id so retrieve/create is idempotent with no DB bookkeeping needed) —
// what's being sold is the same "monthly maintenance" service across
// clients; only the price differs per client, which is exactly what
// price_data on the subscription item is for. Unlike invoice items
// (create-invoice.ts), a subscription item's inline price_data needs a
// real Product id, not an inline product_data shorthand.
const MAINTENANCE_PRODUCT_ID = "hamishai-monthly-maintenance";

async function ensureMaintenanceProduct(stripe: Stripe) {
  try {
    return await stripe.products.retrieve(MAINTENANCE_PRODUCT_ID);
  } catch {
    return await stripe.products.create({ id: MAINTENANCE_PRODUCT_ID, name: "Monthly maintenance" });
  }
}

// Turns a client's custom monthly rate into a real Stripe subscription —
// replacing recurring-invoices.ts's old flow, where a cron job hand-
// created a fresh one-off invoice every month and tracked "already billed
// this month" by string-matching the invoice description. Stripe's own
// subscription engine now owns the billing cycle end to end; this
// function only ever creates the subscription once, at admin's decision
// (not automatically the moment a rate is set — see createInvoice's own
// reasoning for the same "needs a human decision" call).
//
// Per-client custom pricing (not one of the three site-config.ts package
// tiers) means there's no shared Stripe Price object to attach — Stripe's
// inline price_data is built for exactly this, a one-off recurring price
// scoped to a single subscription rather than a reusable catalog price.
//
// collection_method "send_invoice" rather than "charge_automatically",
// same reasoning as create-invoice.ts: most clients won't have a saved
// card yet, and silently auto-charging one the moment they add it via the
// Customer Portal isn't the right default without them expecting it.
export async function startSubscription(clientId: string) {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe is not configured." as const };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, business_name, email, stripe_customer_id, stripe_subscription_id, maintenance_monthly_pence")
    .eq("id", clientId)
    .single();

  if (clientError || !client) return { error: "Client not found." as const };
  if (!client.email) return { error: "This client has no email on file — needed for billing." as const };
  if (!client.maintenance_monthly_pence || client.maintenance_monthly_pence <= 0) {
    return { error: "Set a recurring monthly rate before starting a subscription." as const };
  }
  if (client.stripe_subscription_id) {
    return { error: "This client already has a subscription." as const };
  }

  let stripeCustomerId = client.stripe_customer_id as string | null;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ email: client.email, name: client.business_name });
    stripeCustomerId = customer.id;
    await supabase.from("clients").update({ stripe_customer_id: stripeCustomerId }).eq("id", client.id);
  }

  try {
    const product = await ensureMaintenanceProduct(stripe);

    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      collection_method: "send_invoice",
      days_until_due: 14,
      items: [
        {
          price_data: {
            currency: "gbp",
            product: product.id,
            unit_amount: client.maintenance_monthly_pence,
            recurring: { interval: "month" },
          },
        },
      ],
    });

    const { error: updateError } = await supabase
      .from("clients")
      .update({ stripe_subscription_id: subscription.id, subscription_status: subscription.status })
      .eq("id", client.id);
    if (updateError) logError("subscription.save_id_failed", { client_id: client.id, stripe_subscription_id: subscription.id, message: updateError.message });

    logInfo("subscription.started", { client_id: client.id, stripe_subscription_id: subscription.id, amount_pence: client.maintenance_monthly_pence });
    return { subscriptionId: subscription.id };
  } catch (error) {
    logError("subscription.create_failed", { client_id: client.id, message: error instanceof Error ? error.message : String(error) });
    await sendErrorAlert("Subscription creation", `Failed to create a Stripe subscription for ${client.business_name}: ${error}`);
    return { error: "Failed to create the subscription via Stripe." as const };
  }
}

export async function cancelSubscription(clientId: string) {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe is not configured." as const };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: client } = await supabase.from("clients").select("business_name, stripe_subscription_id").eq("id", clientId).single();
  if (!client?.stripe_subscription_id) return { error: "No subscription to cancel." as const };

  try {
    await stripe.subscriptions.cancel(client.stripe_subscription_id);
    const { error } = await supabase
      .from("clients")
      .update({ stripe_subscription_id: null, subscription_status: "canceled" })
      .eq("id", clientId);
    if (error) logError("subscription.clear_id_failed", { client_id: clientId, message: error.message });

    logInfo("subscription.cancelled", { client_id: clientId, stripe_subscription_id: client.stripe_subscription_id });
    return { ok: true as const };
  } catch (error) {
    logError("subscription.cancel_failed", { client_id: clientId, message: error instanceof Error ? error.message : String(error) });
    await sendErrorAlert("Subscription cancellation", `Failed to cancel the Stripe subscription for ${client?.business_name}: ${error}`);
    return { error: "Failed to cancel the subscription via Stripe." as const };
  }
}
