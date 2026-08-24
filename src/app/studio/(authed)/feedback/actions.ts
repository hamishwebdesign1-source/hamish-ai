"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { sendFeedbackAlert } from "@/lib/send-feedback-alert";

// Same local requireOrgAndEmail() copy as billing/actions.ts — see that
// file's own comment for why this isn't a shared import.
async function requireOrgAndEmail(): Promise<{ orgId: string; orgName: string; email: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) throw new Error("Not signed in.");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) throw new Error("No organisation found for this session.");

  const { data: org } = await supabase.from("organisations").select("name").eq("id", membership.orgId).single();
  return { orgId: membership.orgId, orgName: org?.name ?? "Unknown agency", email: user.email };
}

// Bound directly to a <form action>, same void-returning /
// redirect-with-query-param shape as every other simple form in
// /studio (see billing/actions.ts's startCheckout for the pattern this
// follows) — no client-side state needed for a single textarea.
export async function submitFeedback(formData: FormData) {
  const { orgName, email } = await requireOrgAndEmail();

  const message = String(formData.get("message") ?? "").trim();
  if (!message) {
    redirect("/studio/feedback?error=" + encodeURIComponent("Feedback can't be empty."));
  }

  await sendFeedbackAlert(orgName, email, message);
  redirect("/studio/feedback?sent=success");
}
