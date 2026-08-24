"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAgencyOrganisation, type CreateAgencyInput } from "@/lib/platform-onboarding";
import { createPlatformCheckoutSession } from "@/lib/platform-checkout";
import type { PlatformPlanSlug } from "@/lib/platform-plans";

// Same Host-header origin pattern as billing/actions.ts's own
// getOrigin() — a Server Action has no request.url to build success/
// cancel URLs from, kept as its own local copy for the same reason that
// file's version is: it's a few lines, not worth a shared import for.
async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "hamishai.org";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// Thin Server Action wrapper — platform-onboarding.ts's
// createAgencyOrganisation() stays a plain, testable function concerned
// only with creating the org; the trial-vs-pay-now branch lives here
// instead, since it's a routing decision (where does this request end
// up), not part of what "creating an agency" means. startMode/
// selectedPlan come from the wizard's new first step
// (onboarding-wizard.tsx) — "pay-now" skips straight to Stripe Checkout
// for the chosen plan instead of landing in /studio still on the trial.
export async function submitOnboarding(
  input: CreateAgencyInput & { startMode: "trial" | "pay-now"; selectedPlan: PlatformPlanSlug | null }
) {
  const { startMode, selectedPlan, ...agencyInput } = input;
  const result = await createAgencyOrganisation(agencyInput);
  if ("error" in result) return result;

  if (startMode === "pay-now" && selectedPlan) {
    const origin = await getOrigin();
    const checkout = await createPlatformCheckoutSession(
      selectedPlan,
      input.email,
      `${origin}/studio/billing?checkout=success`,
      `${origin}/studio?checkout=cancelled`,
      result.orgId
    );
    // A failed checkout session still leaves a real, working organisation
    // behind (created above) — sending them into /studio rather than
    // back to a dead end means the trial they didn't ask for is at least
    // a usable fallback, not a second failure on top of the first.
    if ("url" in checkout && checkout.url) redirect(checkout.url);
  }

  redirect("/studio");
}
