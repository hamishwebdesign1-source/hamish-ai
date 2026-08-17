"use server";

import { redirect } from "next/navigation";
import { createAgencyOrganisation, type CreateAgencyInput } from "@/lib/platform-onboarding";

// Thin Server Action wrapper — platform-onboarding.ts stays a plain,
// testable function; this is just the "use server" boundary the client
// wizard calls into, same separation as every admin action.ts wrapping a
// src/lib function rather than putting the logic inline here.
export async function submitOnboarding(input: CreateAgencyInput) {
  const result = await createAgencyOrganisation(input);
  if ("error" in result) return result;
  redirect("/studio");
}
