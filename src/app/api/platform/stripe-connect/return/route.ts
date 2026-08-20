import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { refreshConnectAccountStatus } from "@/lib/stripe-connect";

// Where Stripe sends the tenant back after their hosted onboarding flow —
// Stripe explicitly does not guarantee onboarding actually finished just
// because the browser reached this URL, so this re-checks real status via
// the Accounts API rather than trusting the redirect alone (belt-and-
// braces alongside the webhook's own account.updated handler, same
// "explicit check + event as backstop" pattern used everywhere else in
// this app).
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.redirect(new URL("/platform/signup", request.url));

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) return NextResponse.redirect(new URL("/platform/onboarding", request.url));

  const { origin } = new URL(request.url);
  const result = await refreshConnectAccountStatus(membership.orgId);

  if ("error" in result) {
    return NextResponse.redirect(`${origin}/studio/settings?stripe_error=${encodeURIComponent(result.error)}`);
  }
  return NextResponse.redirect(
    `${origin}/studio/settings?${result.chargesEnabled ? "stripe_connected=1" : "stripe_pending=1"}`
  );
}
