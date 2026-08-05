import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getPortalMembership } from "@/lib/portal-membership";
import { getStripe } from "@/lib/stripe";

// Opens Stripe's own hosted Customer Portal for the signed-in client —
// where they add/update a card and see their Stripe-side invoice
// history, without us building either of those ourselves. Session-scoped
// auth (not the service-role client): resolves the caller's own
// stripe_customer_id via RLS the same way every other portal read does,
// so there's no way to pass someone else's customer id in here.
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.redirect(new URL("/portal/login", request.url));

  const membership = await getPortalMembership(supabase, user.email);
  if (!membership) return NextResponse.redirect(new URL("/portal/login", request.url));

  const { data: client } = await supabase.from("clients").select("stripe_customer_id").eq("id", membership.clientId).single();
  const stripe = getStripe();

  if (!stripe || !client?.stripe_customer_id) {
    return NextResponse.redirect(new URL("/portal/billing?error=not_set_up", request.url));
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: client.stripe_customer_id,
      return_url: new URL("/portal/billing", request.url).toString(),
    });
    return NextResponse.redirect(session.url);
  } catch (error) {
    console.error("Failed to create Stripe billing portal session:", error);
    return NextResponse.redirect(new URL("/portal/billing?error=unavailable", request.url));
  }
}
