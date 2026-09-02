import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getPortalMembership } from "@/lib/portal-membership";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveStripeAccountOptions } from "@/lib/subscription";

// Opens Stripe's own hosted Customer Portal for the signed-in client —
// where they add/update a card and see their Stripe-side invoice
// history, without us building either of those ourselves. Session-scoped
// auth (not the service-role client): resolves the caller's own
// stripe_customer_id via RLS the same way every other portal read does,
// so there's no way to pass someone else's customer id in here.
//
// Studio big-ticket ("client-facing Manage billing broken for every
// tenant") — this used to call stripe.billingPortal.sessions.create()
// against the bare platform-level client with no stripeAccount option.
// A Stripe Customer id only exists in the namespace of the account it
// was created under, and subscription.ts/create-invoice.ts both create
// every non-internal org's client Customers under that org's own
// Stripe Connect account (schema-stripe-connect.sql's own "an Express
// account that receives their own clients' invoice payments directly"
// design), never the platform's own top-level account. So for every
// real Agency Platform tenant — everyone except HamishAI's own internal
// org — this route was calling Stripe with the right Customer id in
// the wrong account's namespace, which 404s. Fixed the same way
// startSubscription()/changeSubscriptionPrice()/cancelSubscription()
// already resolve this: via resolveStripeAccountOptions(), leniently
// (requireChargesEnabled: false, same as cancelling) — a client
// viewing/managing an existing payment method just needs to know which
// account their Customer lives under, not a fully working one.
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.redirect(new URL("/portal/login", request.url));

  const membership = await getPortalMembership(supabase, user.email);
  if (!membership) return NextResponse.redirect(new URL("/portal/login", request.url));

  const { data: client } = await supabase.from("clients").select("stripe_customer_id, org_id").eq("id", membership.clientId).single();
  const stripe = getStripe();

  if (!stripe || !client?.stripe_customer_id) {
    return NextResponse.redirect(new URL("/portal/billing?error=not_set_up", request.url));
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.redirect(new URL("/portal/billing?error=unavailable", request.url));

  const accountResolution = await resolveStripeAccountOptions(admin, client.org_id, false);
  if (accountResolution.error) {
    return NextResponse.redirect(new URL("/portal/billing?error=unavailable", request.url));
  }
  const stripeOptions = accountResolution.stripeAccountId ? { stripeAccount: accountResolution.stripeAccountId } : undefined;

  try {
    const session = await stripe.billingPortal.sessions.create(
      {
        customer: client.stripe_customer_id,
        return_url: new URL("/portal/billing", request.url).toString(),
      },
      stripeOptions
    );
    return NextResponse.redirect(session.url);
  } catch (error) {
    console.error("Failed to create Stripe billing portal session:", error);
    return NextResponse.redirect(new URL("/portal/billing?error=unavailable", request.url));
  }
}
