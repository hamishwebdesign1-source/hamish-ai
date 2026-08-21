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

// First-login product tour (Command Centre Phase 4, §26) — called on
// both "finish" and "skip", same real effect either way: don't show it
// automatically again. Restartable from /studio/help regardless.
export async function completeTour() {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { error } = await admin.from("organisations").update({ tour_completed_at: new Date().toISOString() }).eq("id", orgId);
  if (error) return { error: "Failed to save." };

  revalidatePath("/studio");
  return { ok: true as const };
}
