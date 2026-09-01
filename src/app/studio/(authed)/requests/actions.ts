"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateTroubleshootingHelp, type TroubleshootingEntry } from "@/lib/website-troubleshooting";
import { regenerateDraftResponse } from "@/lib/triage-request";
import type { WebsiteBrief } from "@/lib/website-brief";
import type { BuildPhase } from "@/lib/website-build-phases";
import type { ToolId } from "@/lib/ai-coding-tools";
import { getUsageStatus, recordUsageEvent } from "@/lib/usage-limits";
import { isStudioActionRateLimited } from "@/lib/chat-rate-limit";
import type { PlatformPlanSlug } from "@/lib/platform-plans";
import { sendOrgEmail } from "@/lib/send-org-email";
import { logAuditEvent } from "@/lib/audit-log";
import { notifyAssignee } from "@/lib/team-members";

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

// A pure record, deliberately still not a trigger — for a tenant who
// replied to their client some other way (their own inbox, a call) and
// just wants Studio's own status to reflect it. sendRequestReply() below
// is the actual trigger, added once tenant-scoped email (roadmap item
// #1) made it safe to build — this one stays as it always was.
// Same session-derivation as requireOrgId() above, plus the signed-in
// person's own email -- needed here (and not by requireOrgId's other
// callers in this file) so assignRequest() can log a real actor and
// verify the assignee is actually a teammate, not just any string a
// tampered client request could send.
async function requireOrgIdAndEmail(): Promise<{ orgId: string; email: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) throw new Error("Not signed in.");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) throw new Error("No organisation found for this session.");
  return { orgId: membership.orgId, email: user.email };
}

// Studio big-ticket ("team collaboration") — memberships (invite/remove)
// has existed since team-members.ts shipped, but nothing let anyone
// actually claim a piece of work. `assigneeEmail: null` clears the
// assignment back to "unassigned" -- the same request card can be
// reassigned or unclaimed at any time, there's no "locked once claimed"
// rule here.
export async function assignRequest(requestId: string, assigneeEmail: string | null) {
  const { orgId, email: actorEmail } = await requireOrgIdAndEmail();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };
  if (!(await requestBelongsToOrg(admin, requestId, orgId))) return { error: "Request not found." };

  const normalised = assigneeEmail?.trim().toLowerCase() || null;
  if (normalised) {
    const { data: member } = await admin
      .from("memberships")
      .select("email")
      .eq("org_id", orgId)
      .eq("email", normalised)
      .maybeSingle();
    if (!member) return { error: "That person isn't on your team." };
  }

  const { error } = await admin.from("requests").update({ assigned_to: normalised }).eq("id", requestId);
  if (error) return { error: "Failed to update." };

  logAuditEvent({
    actor: actorEmail,
    actorType: "admin",
    action: normalised ? "request.assigned" : "request.unassigned",
    targetType: "request",
    targetId: requestId,
    orgId,
    metadata: normalised ? { assignedTo: normalised } : undefined,
  });

  // Big-ticket #4 ("invites and assignments are silent") — fire-and-forget,
  // same convention every other notification send in this app follows
  // (audit-log.ts's own comment: never let a notification failure look
  // like the underlying write failed).
  if (normalised) {
    const { data: request } = await admin.from("requests").select("clients(business_name)").eq("id", requestId).maybeSingle();
    const clients = request?.clients as { business_name: string } | { business_name: string }[] | null;
    const businessName = (Array.isArray(clients) ? clients[0] : clients)?.business_name;
    notifyAssignee(admin, {
      orgId,
      assigneeEmail: normalised,
      assignedByEmail: actorEmail,
      itemLabel: businessName ? `a request from ${businessName}` : "a client request",
      path: "/studio/requests",
    });
  }

  revalidatePath("/studio/requests");
  return { ok: true as const };
}

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

// Studio big-ticket ("two-way client request threads") — the "send" half
// of turning "responding" from a record into a real trigger, now that
// roadmap item #1 (send-org-email.ts) gives a tenant a real identity to
// send under. Deliberately still not the full ambition a real two-way
// thread implies (storing and displaying incoming replies as a visible
// conversation) — detect-replies.ts's own comment is explicit that it
// only ever checks *whether* a reply exists, never reads or stores a
// message's subject or body, a real, deliberate privacy-minimisation
// choice that shouldn't get quietly widened as a side effect of this.
// This closes the other, safer half: whatever's in draft_response — the
// AI's own first attempt, or a tenant's own edited version — actually
// goes out as a real email instead of only ever being copied out by
// hand, and marks the request responded in the same step, since sending
// it *is* responding.
export async function sendRequestReply(requestId: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: request } = await admin
    .from("requests")
    .select("id, client_id, draft_response")
    .eq("id", requestId)
    .maybeSingle();
  if (!request || !(await requestBelongsToOrg(admin, requestId, orgId))) return { error: "Request not found." };
  if (!request.draft_response?.trim()) return { error: "Write a reply before sending." };

  const { data: client } = await admin.from("clients").select("email").eq("id", request.client_id).single();
  if (!client?.email) return { error: "This client has no email on file." };

  const { data: org } = await admin.from("organisations").select("name, brand").eq("id", orgId).single();
  const replyToEmail = (org?.brand as { replyToEmail?: string } | null)?.replyToEmail;
  if (!org || !replyToEmail) {
    return { error: "Set a reply-to email in Studio Settings first — that's what lets you send replies from here." };
  }

  const result = await sendOrgEmail({
    orgId,
    orgName: org.name,
    replyToEmail,
    to: client.email,
    subject: `A reply from ${org.name}`,
    text: request.draft_response,
  });
  if ("error" in result) return { error: result.error };

  const { error } = await admin.from("requests").update({ responded_at: new Date().toISOString() }).eq("id", requestId);
  if (error) return { error: "Sent, but failed to mark this request as responded — refresh to check." };

  revalidatePath("/studio/requests");
  return { ok: true as const };
}

// Studio improvement — a request's draft used to be a one-shot, generated
// only at intake by triageRequest(); there was no way to ask for a fresh
// attempt without editing it by hand. Reuses regenerateDraftResponse()
// (triage-request.ts's own comment on why that's a separate, side-effect-
// free function rather than re-running the full intake pipeline) and
// writes the result onto this one request's draft_response only —
// category/priority/complexity/coverage are untouched, so regenerating
// the reply text never silently reclassifies the ticket.
export async function regenerateRequestDraft(requestId: string): Promise<{ draftResponse: string } | { error: string }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: request } = await admin.from("requests").select("id, client_id, raw_text").eq("id", requestId).maybeSingle();
  if (!request || !(await requestBelongsToOrg(admin, requestId, orgId))) return { error: "Request not found." };

  const result = await regenerateDraftResponse(request.client_id, request.raw_text);
  if ("error" in result) return result;

  const { error } = await admin.from("requests").update({ draft_response: result.draftResponse }).eq("id", requestId);
  if (error) return { error: "Got a new draft but failed to save it." };

  revalidatePath("/studio/requests");
  return { draftResponse: result.draftResponse };
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
