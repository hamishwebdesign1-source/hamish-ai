import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { createConnectOnboardingLink } from "@/lib/stripe-connect";

// Same shape as /api/platform/ms-connect — session-gated, re-derives the
// caller's own org rather than trusting anything in the URL, redirects
// straight into Stripe's own hosted flow.
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.redirect(new URL("/platform/signup", request.url));

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) return NextResponse.redirect(new URL("/platform/onboarding", request.url));

  const { origin } = new URL(request.url);
  const result = await createConnectOnboardingLink(
    membership.orgId,
    `${origin}/api/platform/stripe-connect/return`,
    `${origin}/api/platform/stripe-connect/start`
  );

  if ("error" in result) {
    return NextResponse.redirect(`${origin}/studio/settings?stripe_error=${encodeURIComponent(result.error)}`);
  }
  return NextResponse.redirect(result.url);
}
