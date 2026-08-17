"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { discoverLeads } from "@/lib/discover-leads";

// Every action here re-derives the caller's org from their own session
// rather than trusting an orgId argument from the client — Server Actions
// don't inherit a page's own auth check the way a nested layout does, so
// this re-applies the same "never trust the client for which tenant this
// is" rule the rest of /studio gets from its (authed) layout.
async function requireOrgId(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not signed in.");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) throw new Error("No organisation found for this session.");
  return membership.orgId;
}

export async function updateProspectingConfig(input: { categories: string[]; areas: string[] }) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  // Merge rather than overwrite — prospecting_config also carries the
  // agencyType/services chosen during onboarding (platform-onboarding.ts),
  // and a settings update here shouldn't silently erase those.
  const { data: org } = await admin.from("organisations").select("prospecting_config").eq("id", orgId).single();
  const merged = { ...(org?.prospecting_config ?? {}), categories: input.categories, areas: input.areas };

  const { error } = await admin.from("organisations").update({ prospecting_config: merged }).eq("id", orgId);
  if (error) return { error: "Failed to save your prospecting settings." };

  revalidatePath("/studio/prospects");
  return { ok: true as const };
}

export async function runDiscovery() {
  const orgId = await requireOrgId();
  const result = await discoverLeads(orgId);
  revalidatePath("/studio/prospects");
  return result;
}
