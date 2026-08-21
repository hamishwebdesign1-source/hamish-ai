"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateTroubleshootingHelp, type TroubleshootingEntry } from "@/lib/website-troubleshooting";
import type { WebsiteBrief } from "@/lib/website-brief";
import type { BuildPhase } from "@/lib/website-build-phases";
import type { ToolId } from "@/lib/ai-coding-tools";
import { getUsageStatus, recordUsageEvent } from "@/lib/usage-limits";
import { isStudioActionRateLimited } from "@/lib/chat-rate-limit";
import type { PlatformPlanSlug } from "@/lib/platform-plans";

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

// Same usage/rate-limit discipline as website-builder/actions.ts's own
// checkAiUsage() — this is the exact same AI call (generateTroubleshootingHelp)
// entered from a different surface, so it counts against the same
// website_troubleshooting_generated cap rather than opening a loophole
// where routing a fix through Requests instead of the composer directly
// would dodge the org's monthly ceiling.
async function checkAiUsage(orgId: string): Promise<
  | { allowed: true; isInternal: boolean }
  | { allowed: false; isInternal: false; rateLimited: true }
  | { allowed: false; isInternal: false; rateLimited: false; used: number; limit: number }
> {
  const admin = getSupabaseAdmin();
  if (!admin) return { allowed: true, isInternal: false };

  const { data: org } = await admin.from("organisations").select("plan, is_internal").eq("id", orgId).single();
  if (!org || org.is_internal) return { allowed: true, isInternal: true };

  if (await isStudioActionRateLimited(orgId)) return { allowed: false, isInternal: false, rateLimited: true };

  const usage = await getUsageStatus(orgId, "website_troubleshooting_generated", org.plan as PlatformPlanSlug);
  if (!usage.allowed) return { allowed: false, isInternal: false, rateLimited: false, used: usage.used, limit: usage.limit };
  return { allowed: true, isInternal: false };
}

function aiUsageErrorMessage(usageCheck: { rateLimited: true } | { rateLimited: false; used: number; limit: number }): string {
  if (usageCheck.rateLimited) return "You're doing that a lot right now — wait a few minutes and try again.";
  return `Monthly limit reached (${usageCheck.used} of ${usageCheck.limit}) — try again next month.`;
}

// AI Website Creation Guide, WB7 — the client-feedback-to-AI-task loop
// (plan doc §15). Turns a client's raw request text into the same
// diagnosis + ready-to-paste fix prompt the troubleshooting composer
// produces (WB5's generateTroubleshootingHelp(), reused rather than
// duplicated), grounded in the linked website project's real brief and
// current build phase. Saved onto that project's own troubleshooting_log
// — so it shows up in the same place, with the same Copy button, as
// anything the agency asked the composer directly.
export async function turnRequestIntoWebsiteTask(
  requestId: string,
  websiteProjectId: string
): Promise<{ error: string } | { ok: true; entry: TroubleshootingEntry }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: request } = await admin.from("requests").select("id, client_id, raw_text").eq("id", requestId).maybeSingle();
  if (!request || !(await requestBelongsToOrg(admin, requestId, orgId))) return { error: "Request not found." };

  const { data: project } = await admin
    .from("website_projects")
    .select("id, client_id, brief, recommended_tool, build_phases, current_phase_index, troubleshooting_log")
    .eq("id", websiteProjectId)
    .eq("org_id", orgId)
    .single();
  if (!project) return { error: "Website project not found." };
  // A request can only be linked to a website project belonging to the
  // same client — never let one client's feedback land on another
  // client's build, even within the same org.
  if (project.client_id !== request.client_id) return { error: "That project doesn't belong to this request's client." };
  if (!project.brief) return { error: "This website project needs a brief before it can take on tasks." };
  if (!project.recommended_tool) return { error: "This website project needs an AI coding tool chosen first." };

  const usageCheck = await checkAiUsage(orgId);
  if (!usageCheck.allowed) return { error: aiUsageErrorMessage(usageCheck) };

  const phases = project.build_phases as BuildPhase[] | null;
  const currentPhase = phases?.[project.current_phase_index] ?? null;

  const result = await generateTroubleshootingHelp(
    project.brief as WebsiteBrief,
    project.recommended_tool as ToolId,
    currentPhase,
    request.raw_text
  );
  if ("error" in result) return { error: result.error };

  const entry: TroubleshootingEntry = {
    id: crypto.randomUUID(),
    issue: request.raw_text,
    diagnosis: result.diagnosis,
    fixPrompt: result.fixPrompt,
    createdAt: new Date().toISOString(),
  };

  const existingLog = Array.isArray(project.troubleshooting_log) ? (project.troubleshooting_log as TroubleshootingEntry[]) : [];
  const nextLog = [...existingLog, entry].slice(-20);

  const { error: projectError } = await admin.from("website_projects").update({ troubleshooting_log: nextLog }).eq("id", websiteProjectId);
  if (projectError) return { error: "Got an answer but failed to save it." };

  // Persist the link even if the request was already linked to a
  // different project before — the agency can re-point a request if
  // they picked the wrong one the first time.
  await admin.from("requests").update({ website_project_id: websiteProjectId }).eq("id", requestId);

  if (!usageCheck.isInternal) await recordUsageEvent(orgId, "website_troubleshooting_generated");

  revalidatePath("/studio/requests");
  revalidatePath(`/studio/website-builder/${websiteProjectId}`);
  return { ok: true as const, entry };
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
