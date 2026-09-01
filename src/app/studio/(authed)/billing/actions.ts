"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { createPlatformCheckoutSession, createCreditPackCheckoutSession, changePlatformSubscriptionPlan } from "@/lib/platform-checkout";
import type { PlatformPlanSlug } from "@/lib/platform-plans";

// Same session-derivation as prospects/actions.ts's requireOrgId() — kept
// as its own copy here rather than a shared import, since this one also
// needs the caller's email (for Checkout's customer_email) and that's a
// genuine second return value, not just a refactor for its own sake.
//
// Big-ticket #1 ("member has full owner-level power") — role is now part
// of this too: every function below spends the org's own money (a plan
// change, a credit pack purchase, or the Stripe billing portal, which
// can itself change or cancel the subscription). A hired "member" seat
// having the same reach here as the owner was a real gap, same
// settings/actions.ts's own requireOrgMembership()/role checks on team
// management and account deletion.
async function requireOrgAndEmail(): Promise<{ orgId: string; email: string; role: "owner" | "member" }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) throw new Error("Not signed in.");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) throw new Error("No organisation found for this session.");
  return { orgId: membership.orgId, email: user.email, role: membership.role };
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
//
// Billing-bug fix (2026-09-01) — this used to unconditionally create a
// fresh Checkout Session for any plan click, including while the org
// already had a different active subscription running, which orphaned
// the old one in Stripe rather than replacing it (see
// changePlatformSubscriptionPlan()'s own comment in platform-checkout.ts
// for the full story). Now branches first: an org with a real, active
// subscription already gets that subscription's price changed in place
// (no Checkout redirect, no new subscription); Checkout is reserved for
// what it was always actually meant for — a genuinely first subscription
// (trialing, inactive, or never subscribed).
export async function startCheckout(planSlug: PlatformPlanSlug) {
  const { orgId, email, role } = await requireOrgAndEmail();
  if (role !== "owner") redirect(`/studio/billing?error=${encodeURIComponent("Only the workspace owner can change the subscription plan.")}`);

  const admin = getSupabaseAdmin();
  const { data: org } = admin
    ? await admin.from("organisations").select("plan, subscription_status, stripe_subscription_id").eq("id", orgId).single()
    : { data: null };

  if (org?.subscription_status === "active" && org.stripe_subscription_id) {
    if (org.plan === planSlug) redirect("/studio/billing"); // already on this plan — no-op, shouldn't normally be reachable (the button is disabled)

    const result = await changePlatformSubscriptionPlan(orgId, planSlug, org.stripe_subscription_id);
    if ("error" in result) redirect(`/studio/billing?error=${encodeURIComponent(result.error)}`);

    // Immediate UI feedback — the real source of truth going forward is
    // the Stripe webhook's own customer.subscription.updated handler
    // (now syncing `plan` via planSlugForPriceId(), not just
    // subscription_status), which will confirm this again moments later
    // once Stripe delivers the event; this write just avoids the page
    // showing the old plan for however long that round-trip takes.
    if (admin) await admin.from("organisations").update({ plan: planSlug }).eq("id", orgId);

    redirect("/studio/billing?checkout=success");
  }

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

// Same bound-to-a-form, void-returning shape as startCheckout() above —
// a one-time purchase rather than a subscription, so the webhook's
// checkout.session.completed handler branches on session.mode to tell
// them apart (see that route's own comment).
export async function buyCreditPack() {
  const { orgId, email, role } = await requireOrgAndEmail();
  if (role !== "owner") redirect(`/studio/billing?error=${encodeURIComponent("Only the workspace owner can make purchases.")}`);
  const origin = await getOrigin();

  const result = await createCreditPackCheckoutSession(email, `${origin}/studio/billing?credits=success`, `${origin}/studio/billing?credits=cancelled`, orgId);

  if ("error" in result) redirect(`/studio/billing?error=${encodeURIComponent(result.error ?? "Failed to start checkout via Stripe.")}`);
  if (!result.url) redirect(`/studio/billing?error=${encodeURIComponent("Stripe did not return a checkout URL.")}`);
  redirect(result.url);
}

// Opens Stripe's own hosted Customer Portal, same pattern as
// /api/portal/stripe-portal-session — one thing we don't build ourselves.
export async function openBillingPortal() {
  const { orgId, role } = await requireOrgAndEmail();
  if (role !== "owner") redirect(`/studio/billing?error=${encodeURIComponent("Only the workspace owner can access the billing portal.")}`);
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
