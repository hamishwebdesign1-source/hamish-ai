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

// Studio big-ticket ("recurring client billing for tenants") — a Product
// id is scoped per Stripe account the same way a Customer is (retrieving
// MAINTENANCE_PRODUCT_ID under a tenant's stripeAccount option queries
// that connected account's own catalog, entirely separate from the
// platform account's), so this needs the exact same options pass-through
// createInvoice() (create-invoice.ts) already established for every
// other Stripe call in this codebase — one Product per account, created
// once, retrieved from then on.
async function ensureMaintenanceProduct(stripe: Stripe, options?: Stripe.RequestOptions) {
  try {
    return await stripe.products.retrieve(MAINTENANCE_PRODUCT_ID, {}, options);
  } catch {
    return await stripe.products.create({ id: MAINTENANCE_PRODUCT_ID, name: "Monthly maintenance" }, options);
  }
}

// Studio big-ticket — same Connect-account resolution as createInvoice()
// (create-invoice.ts's own comment explains the full reasoning: a direct
// charge under the tenant's own connected account is what actually routes
// the money to their bank account, not just a database attribution fix).
// Kept as its own function rather than inlined twice (startSubscription
// and cancelSubscription both need it) — same client row, same org
// lookup.
//
// requireChargesEnabled defaults true (startSubscription's own need — no
// point creating a new subscription under an account that can't yet take
// a payment) but cancelSubscription calls this with it false: an org
// whose Connect account got disconnected/disabled after a subscription
// was already running should still be able to cancel it using whatever
// account id is on file, even though charges_enabled is now false —
// blocking that would trap them with a live subscription they can't
// stop. Creating is the direction that needs a fully working connected
// account; cancelling only needs to know which account the subscription
// actually lives under.
async function resolveStripeAccountOptions(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  orgId: string | null,
  requireChargesEnabled = true
): Promise<{ stripeAccountId?: string; error?: string }> {
  if (!orgId) return {};
  const { data: org } = await supabase
    .from("organisations")
    .select("is_internal, stripe_connect_account_id, stripe_connect_charges_enabled")
    .eq("id", orgId)
    .single();
  if (!org || org.is_internal) return {};
  if (!org.stripe_connect_account_id) {
    return requireChargesEnabled ? { error: "Connect your Stripe account in Settings before starting a client subscription." } : {};
  }
  if (requireChargesEnabled && !org.stripe_connect_charges_enabled) {
    return { error: "Finish your Stripe Connect setup in Settings before starting a client subscription." };
  }
  return { stripeAccountId: org.stripe_connect_account_id };
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
    .select("id, business_name, email, stripe_customer_id, stripe_subscription_id, maintenance_monthly_pence, org_id")
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

  // Studio big-ticket — resolved *before* any customer/subscription is
  // created: a customer created under the platform account can't be
  // subscribed under a tenant's connected account (they're separate
  // Stripe data namespaces), so this has to happen first, not patched in
  // afterwards the way it would be tempting to bolt on.
  const accountResolution = await resolveStripeAccountOptions(supabase, client.org_id);
  if (accountResolution.error) return { error: accountResolution.error };
  const stripeOptions: Stripe.RequestOptions | undefined = accountResolution.stripeAccountId
    ? { stripeAccount: accountResolution.stripeAccountId }
    : undefined;

  let stripeCustomerId = client.stripe_customer_id as string | null;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ email: client.email, name: client.business_name }, stripeOptions);
    stripeCustomerId = customer.id;
    await supabase.from("clients").update({ stripe_customer_id: stripeCustomerId }).eq("id", client.id);
  }

  try {
    const product = await ensureMaintenanceProduct(stripe, stripeOptions);

    const subscription = await stripe.subscriptions.create(
      {
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
      },
      stripeOptions
    );

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

  const { data: client } = await supabase.from("clients").select("business_name, stripe_subscription_id, org_id").eq("id", clientId).single();
  if (!client?.stripe_subscription_id) return { error: "No subscription to cancel." as const };

  // Studio big-ticket — cancelling under the wrong account context (the
  // platform's own, for a subscription that actually lives under a
  // tenant's connected account) would just 404 against Stripe; resolved
  // the same way startSubscription() resolves it when creating one,
  // requireChargesEnabled: false (see resolveStripeAccountOptions's own
  // comment on why cancel is more lenient than create).
  const accountResolution = await resolveStripeAccountOptions(supabase, client.org_id, false);
  const stripeOptions: Stripe.RequestOptions | undefined = accountResolution.stripeAccountId
    ? { stripeAccount: accountResolution.stripeAccountId }
    : undefined;

  try {
    await stripe.subscriptions.cancel(client.stripe_subscription_id, {}, stripeOptions);
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
