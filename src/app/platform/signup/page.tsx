import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { SignupBrandPanel, SignupBrandPanelMobile } from "@/components/platform/signup-brand-panel";
import { SignupForm } from "@/components/platform/signup-form";

// Google is the primary path for Agency Platform sign-in (real customer
// feedback was that email-a-link felt less like "a proper account" than
// a standard login), magic link stays as the fallback — both go through
// /api/platform/callback, which already handled both PKCE `code` (what
// OAuth returns) and `token_hash`+`type` (what magic link returns)
// before either existed, so signInWithOAuth() and signInWithOtp() just
// exercise paths that route already had. No backend/auth change here —
// this page was redesigned for craft, not architecture; see the 2026-08
// session notes for why (real UI/UX brief, not a request to add
// password or Microsoft auth this app doesn't have).
//
// New: an already-signed-in visitor landing here directly (a bookmark, a
// shared link) used to see the sign-in form again instead of being sent
// straight through — same server-side check /platform/onboarding's own
// page.tsx already does, just one level earlier in the funnel.
export default async function PlatformSignupPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    const membership = await getOrgMembership(supabase, user.email);
    redirect(membership ? "/studio" : "/platform/onboarding");
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <SignupBrandPanel />
      <SignupBrandPanelMobile />
      <div className="flex flex-1 items-center justify-center bg-secondary/20 px-6 py-12 lg:py-16">
        {/* useSearchParams() (inside SignupForm, for the ?plan= relay)
            needs a Suspense boundary around whatever reads it. */}
        <Suspense>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
