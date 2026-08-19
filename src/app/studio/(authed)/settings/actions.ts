"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkForReplies } from "@/lib/detect-replies";

// Same session-derivation as prospects/actions.ts's requireOrgId() — kept
// as its own local copy, same convention billing/actions.ts documents.
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

export async function disconnectInbox() {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { error } = await admin
    .from("email_connections")
    .delete()
    .eq("org_id", orgId)
    .eq("provider", "microsoft");
  if (error) return { error: "Failed to disconnect." };

  revalidatePath("/studio/settings");
  return { ok: true as const };
}

export async function runReplyCheck() {
  const orgId = await requireOrgId();
  const result = await checkForReplies(orgId);
  revalidatePath("/studio/settings");
  revalidatePath("/studio/prospects");
  return result;
}

// Writes into the same organisations.brand jsonb column
// getPortalOrgBranding() (portal-org-branding.ts) already reads —
// existing, working infrastructure that just never had a Studio-side
// editor. Merged rather than overwritten, same reasoning as
// updateProspectingConfig() in prospects/actions.ts: brand is expected to
// grow more keys later (logo, eventually a custom domain per that
// column's own schema comment) and a colour update shouldn't erase them.
export async function updateBrandAccent(color: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  if (!/^#[0-9a-f]{6}$/i.test(color)) return { error: "Enter a valid colour." };

  const { data: org } = await admin.from("organisations").select("brand").eq("id", orgId).single();
  const merged = { ...(org?.brand ?? {}), accentColor: color };

  const { error } = await admin.from("organisations").update({ brand: merged }).eq("id", orgId);
  if (error) return { error: "Failed to save your portal colour." };

  revalidatePath("/studio/settings");
  return { ok: true as const };
}

export async function resetBrandAccent() {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: org } = await admin.from("organisations").select("brand").eq("id", orgId).single();
  const merged = { ...(org?.brand ?? {}) } as Record<string, unknown>;
  delete merged.accentColor;

  const { error } = await admin.from("organisations").update({ brand: merged }).eq("id", orgId);
  if (error) return { error: "Failed to reset your portal colour." };

  revalidatePath("/studio/settings");
  return { ok: true as const };
}
