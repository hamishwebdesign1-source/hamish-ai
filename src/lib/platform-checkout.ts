import { getStripe } from "@/lib/stripe";
import { getPlatformPlan, PROSPECT_CREDIT_PACK, type PlatformPlanSlug } from "@/lib/platform-plans";
import { logInfo, logError } from "@/lib/structured-log";

// Billing-bug fix (2026-09-01) — before this existed, clicking "Subscribe"
// on any plan while already on an active paid one was fully wired and
// unguarded: it always created a brand-new Stripe Checkout Session in
// mode: "subscription", and checkout.session.completed's own handler just
// overwrote organisations.stripe_subscription_id with the new id — the
// *original* Stripe subscription was never cancelled, so it kept
// recurring in Stripe forever, orphaned, invisible to this app (which
// only ever reads the newest id), while the org silently paid for both.
// Confirmed live by reading the actual webhook handler, not assumed.
//
// The real fix is to change the *existing* subscription's price in
// place — stripe.subscriptions.update() on its one line item — not to
// create a second subscription via Checkout at all. Deliberately not
// routed through Stripe's own Billing Portal (openBillingPortal() in
// billing/actions.ts already exists and still works fine for managing
// payment methods/invoices): a portal's ability to let a customer switch
// plans themselves depends on an account-level Portal Configuration this
// codebase has no way to verify is actually set up with subscription
// updates enabled, so a fix that depends on it might silently not
// restore the "change plan" capability at all. A direct API call has no
// such external dependency.
export async function changePlatformSubscriptionPlan(
  orgId: string,
  newPlanSlug: PlatformPlanSlug,
  currentSubscriptionId: string
): Promise<{ ok: true } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe is not configured." };

  const plan = getPlatformPlan(newPlanSlug);
  const newPriceId = process.env[plan.stripePriceEnvVar];
  if (!newPriceId) {
    return { error: `${plan.stripePriceEnvVar} is not set — run scripts/setup-platform-stripe.ts and add the printed Price id to your env vars.` };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(currentSubscriptionId);
    const item = subscription.items.data[0];
    if (!item) return { error: "Your subscription has no billable item to update — contact support." };

    // create_prorations (Stripe's own default), not none — an upgrade
    // charges the prorated difference on the next invoice, a downgrade
    // credits it; either way the tenant is billed correctly for exactly
    // what they used on each plan, never double-charged the way the old
    // bug did by leaving two full-price subscriptions running.
    await stripe.subscriptions.update(currentSubscriptionId, {
      items: [{ id: item.id, price: newPriceId }],
      proration_behavior: "create_prorations",
    });

    logInfo("platform_checkout.subscription_plan_changed", { org_id: orgId, new_plan: newPlanSlug, subscription_id: currentSubscriptionId });
    return { ok: true };
  } catch (error) {
    logError("platform_checkout.subscription_plan_change_failed", {
      org_id: orgId,
      new_plan: newPlanSlug,
      subscription_id: currentSubscriptionId,
      message: error instanceof Error ? error.message : String(error),
    });
    return { error: "Failed to change your plan via Stripe — no changes were made." };
  }
}

// Creates a Stripe Checkout Session for a self-serve Agency Platform
// subscription — deliberately separate from subscription.ts, which bills
// HamishAI's own clients at a custom per-client rate via inline
// price_data. This is the opposite shape: a shared Price per plan
// (created by scripts/setup-platform-stripe.ts), the same for every
// tenant on that tier, which is what Stripe Checkout against a catalog
// Price is built for.
//
// Wired to a real "Subscribe" button from Week 6's /studio/billing.
//
// charge_automatically (Checkout's default), not send_invoice — unlike
// HamishAI's own clients, a self-serve Agency Platform signup is expected
// to enter a card as part of checkout itself, not be invoiced afterwards.
//
// orgId travels in metadata rather than being looked up from the
// customer afterwards — the webhook's checkout.session.completed handler
// needs to know which organisation this payment belongs to before any
// stripe_customer_id has been saved anywhere to look it up by.
export async function createPlatformCheckoutSession(
  planSlug: PlatformPlanSlug,
  email: string,
  successUrl: string,
  cancelUrl: string,
  orgId: string
) {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe is not configured." as const };

  const plan = getPlatformPlan(planSlug);
  const priceId = process.env[plan.stripePriceEnvVar];
  if (!priceId) {
    return { error: `${plan.stripePriceEnvVar} is not set — run scripts/setup-platform-stripe.ts and add the printed Price id to your env vars.` as const };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { platform_plan: planSlug, org_id: orgId },
    });

    logInfo("platform_checkout.session_created", { plan: planSlug, session_id: session.id });
    return { url: session.url };
  } catch (error) {
    logError("platform_checkout.session_failed", { plan: planSlug, message: error instanceof Error ? error.message : String(error) });
    return { error: "Failed to start checkout via Stripe." as const };
  }
}

// One-time prospect credit top-up — mode "payment", not "subscription".
// credits/org_id travel in metadata the same way platform_plan/org_id do
// above, for the same reason: the webhook's checkout.session.completed
// handler needs them before any other lookup is possible. The webhook
// reads `credits` from metadata rather than re-deriving it from
// PROSPECT_CREDIT_PACK at credit time, so a future change to the pack
// size never silently reinterprets an already-paid-for session.
export async function createCreditPackCheckoutSession(email: string, successUrl: string, cancelUrl: string, orgId: string) {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe is not configured." as const };

  const priceId = process.env[PROSPECT_CREDIT_PACK.stripePriceEnvVar];
  if (!priceId) {
    return { error: `${PROSPECT_CREDIT_PACK.stripePriceEnvVar} is not set — run scripts/setup-platform-stripe.ts and add the printed Price id to your env vars.` as const };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { credit_pack: "prospects", credits: String(PROSPECT_CREDIT_PACK.prospects), org_id: orgId },
    });

    logInfo("platform_checkout.credit_pack_session_created", { session_id: session.id, org_id: orgId });
    return { url: session.url };
  } catch (error) {
    logError("platform_checkout.credit_pack_session_failed", { org_id: orgId, message: error instanceof Error ? error.message : String(error) });
    return { error: "Failed to start checkout via Stripe." as const };
  }
}
