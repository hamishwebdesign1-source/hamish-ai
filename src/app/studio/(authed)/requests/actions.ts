"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";

// Same session-derivation as prospects/actions.ts's requireOrgId() — kept
// as its own local copy, same convention billing/actions.ts documents.
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

// Ownership check every action here needs: a request only belongs to this
// org if its client does. No RLS backstop on the write path (these go
// through the service-role client, same as every other Server Action in
// this app) — schema-rls-requests-tasks-org-staff.sql's SELECT policy is
// what protects the page's own read, this is the equivalent for writes.
async function requestBelongsToOrg(admin: ReturnType<typeof getSupabaseAdmin>, requestId: string, orgId: string) {
  if (!admin) return false;
  const { data } = await admin
    .from("requests")
    .select("id, clients!inner(org_id)")
    .eq("id", requestId)
    .eq("clients.org_id", orgId)
    .maybeSingle();
  return Boolean(data);
}

// Deliberately no client-facing email here, unlike /admin's own
// updateTaskStatus() — sendClientEmail has no per-tenant identity (fixed
// separately in triage-request.ts), so a tenant marking a request
// responded doesn't trigger anything automatic. They've already sent
// their own reply themselves (using the draft below as a starting point,
// or their own words) before clicking this — it's a record, not a trigger.
export async function markRequestResponded(requestId: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };
  if (!(await requestBelongsToOrg(admin, requestId, orgId))) return { error: "Request not found." };

  const { error } = await admin
    .from("requests")
    .update({ responded_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) return { error: "Failed to update." };

  revalidatePath("/studio/requests");
  return { ok: true as const };
}

// The AI's draft is a starting point, not a final answer — same
// philosophy as the ICP generator on /studio/prospects (fills fields for
// review, never saves or sends on its own). Editable here so a tenant can
// fix it before copying it out to actually send themselves.
export async function updateRequestDraft(requestId: string, draftResponse: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };
  if (!(await requestBelongsToOrg(admin, requestId, orgId))) return { error: "Request not found." };

  const { error } = await admin.from("requests").update({ draft_response: draftResponse }).eq("id", requestId);
  if (error) return { error: "Failed to save." };

  revalidatePath("/studio/requests");
  return { ok: true as const };
}

export async function updateTaskStatus(taskId: string, status: "todo" | "in_progress" | "done") {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  // Two plain queries rather than a doubly-nested embedded-resource
  // filter (tasks -> requests -> clients) — simpler to be sure is
  // correct than a two-level-deep !inner filter with no test coverage
  // behind it.
  const { data: task } = await admin.from("tasks").select("id, request_id").eq("id", taskId).maybeSingle();
  if (!task || !(await requestBelongsToOrg(admin, task.request_id, orgId))) return { error: "Task not found." };

  const { error } = await admin.from("tasks").update({ status }).eq("id", taskId);
  if (error) return { error: "Failed to update task." };

  revalidatePath("/studio/requests");
  return { ok: true as const };
}
