import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { OnboardingWizard } from "@/components/platform/onboarding-wizard";

// Server-side gate, same shape as the (authed) layouts elsewhere in this
// app: no session → back to the sign-in step; already has an
// organisation → this step is done, go straight to the workspace. Only a
// signed-in, orgless session actually sees the wizard.
export default async function PlatformOnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (membership) redirect("/studio");

  return <OnboardingWizard email={user.email} />;
}
