import { getSupabaseAdmin } from "@/lib/supabase";
import type { PlatformPlanSlug } from "@/lib/platform-plans";
import { logInfo, logError } from "@/lib/structured-log";

// Turns a signed-in-but-orgless session into a real organisation — the
// step between /platform/signup (proves the email) and /studio (needs an
// org to exist). Deliberately takes the service-role client: organisations
// and memberships are SELECT-only for session clients (schema-organisations.sql),
// same convention as client_members, so this write can only ever happen
// server-side, never from the browser directly.
//
// No plan/billing wiring yet — every org created here starts on 'starter'
// with no Stripe subscription behind it. Week 4's onboarding wizard exists
// to get a real workspace in front of the private-beta invites in the
// 90-day plan's Month 2, not to take payment; platform-checkout.ts gets
// wired in once that's the actual next step, not before.
export type CreateAgencyInput = {
  email: string;
  agencyName: string;
  agencyType: string;
  services: string[];
  accentColor: string | null;
};

export type CreateAgencyResult = { orgId: string } | { error: string };

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  // Short random suffix rather than a numeric counter — avoids a
  // read-then-write race between two people picking the same agency name
  // at the same moment, at the cost of a slightly less tidy slug.
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "agency"}-${suffix}`;
}

export async function createAgencyOrganisation(input: CreateAgencyInput): Promise<CreateAgencyResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  if (!input.agencyName.trim()) return { error: "Agency name is required." };

  // One person, one organisation, decided by the same email their session
  // is under — if they've already been through this (e.g. clicked the
  // magic link twice), send them back to their existing workspace instead
  // of creating a second one.
  const { data: existingMembership } = await admin
    .from("memberships")
    .select("org_id")
    .eq("email", input.email)
    .limit(1)
    .maybeSingle();
  if (existingMembership) return { orgId: existingMembership.org_id };

  const { data: org, error: orgError } = await admin
    .from("organisations")
    .insert({
      name: input.agencyName.trim(),
      slug: slugify(input.agencyName),
      is_internal: false,
      plan: "starter" satisfies PlatformPlanSlug,
      brand: input.accentColor ? { accentColor: input.accentColor } : {},
      // agencyType/services aren't a column of their own yet — no other
      // part of the product reads them structurally this week, so they
      // live in prospecting_config's free-form jsonb rather than adding
      // two columns nothing queries against yet. Revisit once /studio
      // actually branches behaviour on agency type.
      prospecting_config: { agencyType: input.agencyType, services: input.services },
    })
    .select("id")
    .single();

  if (orgError || !org) {
    logError("platform_onboarding.org_create_failed", { message: orgError?.message });
    return { error: "Failed to create your agency workspace." };
  }

  // accepted_at is set immediately, not left null the way an *invited*
  // member's row is (see client_members' backfill) — this person created
  // the organisation themselves in the same request, so there's no
  // separate invite to accept.
  const { error: membershipError } = await admin.from("memberships").insert({
    org_id: org.id,
    email: input.email,
    role: "owner",
    invited_by: "self-signup",
    accepted_at: new Date().toISOString(),
  });

  if (membershipError) {
    logError("platform_onboarding.membership_create_failed", { org_id: org.id, message: membershipError.message });
    return { error: "Your agency was created, but adding you as its owner failed. Contact support." };
  }

  logInfo("platform_onboarding.org_created", { org_id: org.id, agency_type: input.agencyType });
  return { orgId: org.id };
}
