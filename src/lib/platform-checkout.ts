import { getStripe } from "@/lib/stripe";
import { getPlatformPlan, type PlatformPlanSlug } from "@/lib/platform-plans";
import { logInfo, logError } from "@/lib/structured-log";

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
