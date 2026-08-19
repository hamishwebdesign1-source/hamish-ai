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
