"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";

// Same session-derivation as every other /studio actions.ts file.
async function requireOrgId(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) throw new Error("Not signed in.");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) throw new Error("No organisation found for this session.");
  return membership.orgId;
}

// Marketing Campaign (Command Centre Phase 4, §27) — deliberately thin
// per the brief's own instruction: name it, set an objective, see which
// real prospects belong to it. No budget/spend tracking or ad-platform
// integration — no real data exists for either yet, and inventing UI
// around numbers that aren't real would break this app's whole "never
// fabricate" discipline.
export async function createCampaign(name: string, objective: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const trimmedName = name.trim();
  if (!trimmedName) return { error: "Give the campaign a name." };

  const { error } = await admin.from("campaigns").insert({ org_id: orgId, name: trimmedName, objective: objective.trim() || null });
  if (error) return { error: "Failed to create the campaign." };

  revalidatePath("/studio/campaigns");
  return { ok: true as const };
}

export async function updateCampaignStatus(campaignId: string, status: "active" | "completed") {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { error } = await admin.from("campaigns").update({ status }).eq("id", campaignId).eq("org_id", orgId);
  if (error) return { error: "Failed to update the campaign." };

  revalidatePath("/studio/campaigns");
  return { ok: true as const };
}

// Real-improvement pass — campaigns previously had no way to be removed
// once created (create + status-toggle only), so a typo'd name or a
// duplicate stuck around forever. Severs the link on any assigned
// prospects first rather than blocking on the FK (prospects.campaign_id
// references campaigns(id) with no ON DELETE clause, schema-campaigns.sql)
// — same "sever the link, don't cascade-delete real data" rule
// deleteClientData() (clients/actions.ts) already follows for its own
// nullable foreign keys. A prospect's own record is real data and must
// survive its campaign being deleted.
export async function deleteCampaign(campaignId: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: campaign } = await admin.from("campaigns").select("id").eq("id", campaignId).eq("org_id", orgId).maybeSingle();
  if (!campaign) return { error: "Campaign not found." };

  await admin.from("prospects").update({ campaign_id: null }).eq("campaign_id", campaignId);

  const { error } = await admin.from("campaigns").delete().eq("id", campaignId);
  if (error) return { error: "Failed to delete the campaign." };

  revalidatePath("/studio/campaigns");
  revalidatePath("/studio/prospects");
  return { ok: true as const };
}

// A prospect's campaign is optional — passing null clears it back to
// "unassigned." Same org-ownership check shape as every other
// prospect-touching action in this app.
export async function assignProspectToCampaign(prospectId: string, campaignId: string | null) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: prospect } = await admin.from("prospects").select("id").eq("id", prospectId).eq("org_id", orgId).maybeSingle();
  if (!prospect) return { error: "Prospect not found." };

  if (campaignId) {
    const { data: campaign } = await admin.from("campaigns").select("id").eq("id", campaignId).eq("org_id", orgId).maybeSingle();
    if (!campaign) return { error: "Campaign not found." };
  }

  const { error } = await admin.from("prospects").update({ campaign_id: campaignId }).eq("id", prospectId);
  if (error) return { error: "Failed to update the prospect." };

  revalidatePath("/studio/prospects");
  revalidatePath("/studio/campaigns");
  return { ok: true as const };
}
