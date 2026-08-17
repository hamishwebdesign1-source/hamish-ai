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
// Not called from anywhere yet — Week 4's onboarding wizard is what wires
// a "Subscribe" button to this. Built now because it's a thin, self-
// contained slice once the Price catalog exists, and having it ready
// removes it from Week 4's critical path.
//
// charge_automatically (Checkout's default), not send_invoice — unlike
// HamishAI's own clients, a self-serve Agency Platform signup is expected
// to enter a card as part of checkout itself, not be invoiced afterwards.
export async function createPlatformCheckoutSession(planSlug: PlatformPlanSlug, email: string, successUrl: string, cancelUrl: string) {
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
      metadata: { platform_plan: planSlug },
    });

    logInfo("platform_checkout.session_created", { plan: planSlug, session_id: session.id });
    return { url: session.url };
  } catch (error) {
    logError("platform_checkout.session_failed", { plan: planSlug, message: error instanceof Error ? error.message : String(error) });
    return { error: "Failed to start checkout via Stripe." as const };
  }
}
