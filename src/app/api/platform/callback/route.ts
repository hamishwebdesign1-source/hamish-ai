import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getOrgMembership, markOrgMembershipAccepted } from "@/lib/org-membership";
import { logInfo, logWarn } from "@/lib/structured-log";

// Same two-format handling as /api/portal/callback (PKCE code vs.
// token_hash+type) — see that file's own comment for why both exist.
// What's genuinely different: /portal/callback always sends a matched
// session straight to /portal, because a client with no client_members
// row simply has no access. Here, no membership yet is the *expected*
// first-time path, not an error state — it means "verified, but hasn't
// finished onboarding," so it branches to /platform/onboarding instead of
// showing a dead end.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  // Relayed from /platform/signup's own redirectTo/emailRedirectTo (see
  // that file's comment) on to /platform/onboarding below — only
  // meaningful for a genuinely new signup; an existing member goes
  // straight to /studio regardless of which plan's "Sign up" button they
  // clicked, since they already have one.
  const plan = searchParams.get("plan");

  const supabase = await createServerSupabaseClient();

  let email: string | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      email = data.user?.email ?? null;
      logInfo("platform_auth.login_success", { email, method: "code" });
    } else {
      logWarn("platform_auth.login_failed", { method: "code", message: error.message });
    }
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "email",
    });
    if (!error) {
      email = data.user?.email ?? null;
      logInfo("platform_auth.login_success", { email, method: "token_hash" });
    } else {
      logWarn("platform_auth.login_failed", { method: "token_hash", message: error.message });
    }
  }

  if (!email) {
    return NextResponse.redirect(`${origin}/platform/signup?error=1`);
  }

  const membership = await getOrgMembership(supabase, email);

  // Team seats gap fix — markOrgMembershipAccepted() (org-membership.ts)
  // existed since Week 1 but was never actually called anywhere: an
  // invited teammate's row (team-members.ts's inviteTeamMember()) would
  // stay accepted_at: null forever, showing as permanently "Invited" in
  // Settings even after they'd genuinely signed in and were using
  // /studio fine. Idempotent (.is("accepted_at", null) guard), so calling
  // it on every sign-in — not just a detected first one — is harmless for
  // both an owner (already accepted at org-creation time) and a member
  // who accepted on a previous visit.
  if (membership) {
    const admin = getSupabaseAdmin();
    if (admin) await markOrgMembershipAccepted(admin, membership.orgId, email);
  }

  const onboardingUrl = plan ? `/platform/onboarding?plan=${encodeURIComponent(plan)}` : "/platform/onboarding";
  return NextResponse.redirect(`${origin}${membership ? "/studio" : onboardingUrl}`);
}
