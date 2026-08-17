"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { createPlatformCheckoutSession } from "@/lib/platform-checkout";
import type { PlatformPlanSlug } from "@/lib/platform-plans";

// Same session-derivation as prospects/actions.ts's requireOrgId() — kept
// as its own copy here rather than a shared import, since this one also
// needs the caller's email (for Checkout's customer_email) and that's a
// genuine second return value, not just a refactor for its own sake.
async function requireOrgAndEmail(): Promise<{ orgId: string; email: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not signed in.");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) throw new Error("No organisation found for this session.");
  return { orgId: membership.orgId, email: user.email };
}

// Server Actions don't receive a Request the way a route handler does, so
// there's no request.url to build success/cancel URLs from — reading the
// Host header directly is the equivalent for this context. Falls back to
// the production domain only if headers() somehow returns neither (never
// observed in practice; Vercel and `next dev` both always set Host).
async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "hamishai.org";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// Bound directly to a <form action>, which requires a void-returning
// action — same convention as addClient() in
// /admin/(authed)/clients/page.tsx, which redirects with an error query
// param on failure rather than returning a value the form couldn't use
// anyway.
export async function startCheckout(planSlug: PlatformPlanSlug) {
  const { orgId, email } = await requireOrgAndEmail();
  const origin = await getOrigin();

  const result = await createPlatformCheckoutSession(
    planSlug,
    email,
    `${origin}/studio/billing?checkout=success`,
    `${origin}/studio/billing?checkout=cancelled`,
    orgId
  );

  if ("error" in result) redirect(`/studio/billing?error=${encodeURIComponent(result.error ?? "Failed to start checkout via Stripe.")}`);
  if (!result.url) redirect(`/studio/billing?error=${encodeURIComponent("Stripe did not return a checkout URL.")}`);
  redirect(result.url);
}

// Opens Stripe's own hosted Customer Portal, same pattern as
// /api/portal/stripe-portal-session — one thing we don't build ourselves.
export async function openBillingPortal() {
  const { orgId } = await requireOrgAndEmail();
  const admin = getSupabaseAdmin();
  if (!admin) redirect(`/studio/billing?error=${encodeURIComponent("Supabase is not configured.")}`);

  const { data: org } = await admin.from("organisations").select("stripe_customer_id").eq("id", orgId).single();
  const stripe = getStripe();
  if (!stripe || !org?.stripe_customer_id) {
    redirect(`/studio/billing?error=${encodeURIComponent("No billing account yet — subscribe to a plan first.")}`);
  }

  const origin = await getOrigin();
  let url: string;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${origin}/studio/billing`,
    });
    url = session.url;
  } catch (error) {
    console.error("Failed to create platform billing portal session:", error);
    redirect(`/studio/billing?error=${encodeURIComponent("Failed to open billing portal.")}`);
  }
  redirect(url);
}
