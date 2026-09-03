"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit-log";
import { notifyAssignee } from "@/lib/team-members";
import { isProjectStage, deriveProjectStatus } from "@/lib/project-stages";

// Same session-derivation as every other /studio actions file — kept as
// its own local copy, same convention documented in billing/actions.ts.
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

// Same shape as requests/actions.ts's requireOrgIdAndEmail() — a
// separate local helper rather than changing requireOrgId()'s own return
// shape, same "duplicated per file on purpose" convention above.
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

// P1 platform readiness item — lightweight project tracking. A project is
// just a named deliverable against one of this org's own clients, with an
// optional target date. No RLS backstop on the writes below (service-role
// client, same as every other Studio Server Action) — schema-rls-projects-org-staff.sql's
// SELECT policy is what protects the read side.
//
// Projects Kanban Command Centre, Phase A — every new project starts at
// the first stage (`not_started`, no reason to offer picking a starting
// stage for something that, by definition, just began) and now logs
// `project.created` (previously never logged at all — a real gap the
// design flagged: without it, a project's own activity trail would start
// mid-story on every project that predates this phase's first stage
// change, which reads as broken, not just incomplete).
export async function createProject(clientId: string, name: string, targetDate: string | null) {
  const { orgId, email: actorEmail } = await requireOrgIdAndEmail();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const trimmedName = name.trim();
  if (!trimmedName) return { error: "Give the project a name." };

  const { data: client } = await admin.from("clients").select("id").eq("id", clientId).eq("org_id", orgId).maybeSingle();
  if (!client) return { error: "Client not found." };

  const { data: inserted, error } = await admin
    .from("projects")
    .insert({ org_id: orgId, client_id: clientId, name: trimmedName, target_date: targetDate || null, stage: "not_started", status: "active" })
    .select("id")
    .single();
  if (error || !inserted) return { error: "Failed to create the project." };

  logAuditEvent({
    actor: actorEmail,
    actorType: "admin",
    action: "project.created",
    targetType: "project",
    targetId: inserted.id,
    orgId,
    metadata: { name: trimmedName, clientId },
  });

  revalidatePath("/studio/projects");
  revalidatePath("/studio/requests");
  return { ok: true as const };
}

// Studio big-ticket ("team collaboration") — who's actually delivering
// this project, same real slice requests/actions.ts's assignRequest()
// and prospects/actions.ts's assignProspect() already ship.
export async function assignProject(projectId: string, assigneeEmail: string | null) {
  const { orgId, email: actorEmail } = await requireOrgIdAndEmail();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: project } = await admin.from("projects").select("id, name").eq("id", projectId).eq("org_id", orgId).maybeSingle();
  if (!project) return { error: "Project not found." };

  const normalised = assigneeEmail?.trim().toLowerCase() || null;
  if (normalised) {
    const { data: member } = await admin.from("memberships").select("email").eq("org_id", orgId).eq("email", normalised).maybeSingle();
    if (!member) return { error: "That person isn't on your team." };
  }

  const { error } = await admin.from("projects").update({ assigned_to: normalised }).eq("id", projectId);
  if (error) return { error: "Failed to update." };

  logAuditEvent({
    actor: actorEmail,
    actorType: "admin",
    action: normalised ? "project.assigned" : "project.unassigned",
    targetType: "project",
    targetId: projectId,
    orgId,
    metadata: normalised ? { assignedTo: normalised } : undefined,
  });

  // Big-ticket #4 ("invites and assignments are silent") — same
  // fire-and-forget shape as assignRequest()/assignProspect()'s own.
  if (normalised) {
    notifyAssignee(admin, {
      orgId,
      assigneeEmail: normalised,
      assignedByEmail: actorEmail,
      itemLabel: `the project "${project.name}"`,
      path: "/studio/projects",
    });
  }

  revalidatePath("/studio/projects");
  revalidatePath(`/studio/projects/${projectId}`);
  return { ok: true as const };
}

export async function updateProjectStatus(projectId: string, status: "active" | "done") {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { error } = await admin.from("projects").update({ status }).eq("id", projectId).eq("org_id", orgId);
  if (error) return { error: "Failed to update the project." };

  revalidatePath("/studio/projects");
  return { ok: true as const };
}

// Projects Kanban Command Centre, Phase A — the board's drag-and-drop
// write, and the same action the detail page's quick-change <select> and
// the mobile per-card <select> (no drag on mobile, per the design) call.
// Same ownership-check + revalidatePath shape as updateProjectStatus
// above; `status` is derived from `stage`, never set independently, so
// the 7 existing call sites that read `status` directly stay correct
// without needing to change.
export async function updateProjectStage(projectId: string, stage: string) {
  const { orgId, email: actorEmail } = await requireOrgIdAndEmail();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  if (!isProjectStage(stage)) return { error: "Not a valid stage." };

  const { data: project } = await admin.from("projects").select("id, stage").eq("id", projectId).eq("org_id", orgId).maybeSingle();
  if (!project) return { error: "Project not found." };

  const nextStatus = deriveProjectStatus(stage);
  const { error } = await admin.from("projects").update({ stage, status: nextStatus }).eq("id", projectId);
  if (error) return { error: "Failed to update the project stage." };

  if (project.stage !== stage) {
    logAuditEvent({
      actor: actorEmail,
      actorType: "admin",
      action: "project.stage_changed",
      targetType: "project",
      targetId: projectId,
      orgId,
      metadata: { from: project.stage, to: stage },
    });
  }

  revalidatePath("/studio/projects");
  revalidatePath(`/studio/projects/${projectId}`);
  revalidatePath("/studio/requests");
  return { ok: true as const };
}

// Projects Kanban Command Centre, Phase A — "add a task directly to this
// project," a genuinely new capability: today the only way a task is
// ever created is via AI triage (triageRequest()'s suggested_task). Same
// ownership-check pattern as createProject above. request_id stays null
// — this task has no parent request, and the detail page's task list
// only renders the "From: <request>" context line when one exists.
export async function createProjectTask(projectId: string, title: string, description: string | null) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { error: "Give the task a title." };

  const { data: project } = await admin.from("projects").select("id").eq("id", projectId).eq("org_id", orgId).maybeSingle();
  if (!project) return { error: "Project not found." };

  const { error } = await admin.from("tasks").insert({
    request_id: null,
    project_id: projectId,
    title: trimmedTitle,
    description: description?.trim() || null,
    status: "todo",
  });
  if (error) return { error: "Failed to create the task." };

  revalidatePath(`/studio/projects/${projectId}`);
  revalidatePath("/studio/requests");
  return { ok: true as const };
}

// Projects Kanban Command Centre, Phase A — the detail page's own task
// status control. requests/actions.ts's updateTaskStatus() verifies
// ownership via the task's parent request (task.request_id ->
// requests.client_id -> clients.org_id) — that chain doesn't exist for a
// task created directly on a project (createProjectTask() above,
// request_id null), so `.eq("id", null)` would silently never match and
// every manually-added task's status button would fail with "Task not
// found." This is the equivalent ownership check scoped through the
// task's project instead — works for every task the detail page shows,
// regardless of how it was created (AI-triaged then assigned via
// assignTaskToProject, or added directly here), since every task shown
// there by definition has project_id set to the project being viewed.
export async function updateProjectTaskStatus(taskId: string, status: "todo" | "in_progress" | "done") {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: task } = await admin.from("tasks").select("id, project_id").eq("id", taskId).maybeSingle();
  if (!task || !task.project_id) return { error: "Task not found." };

  const { data: project } = await admin.from("projects").select("id").eq("id", task.project_id).eq("org_id", orgId).maybeSingle();
  if (!project) return { error: "Task not found." };

  const { error } = await admin.from("tasks").update({ status }).eq("id", taskId);
  if (error) return { error: "Failed to update task." };

  revalidatePath(`/studio/projects/${task.project_id}`);
  revalidatePath("/studio/requests");
  return { ok: true as const };
}

// A task's project is optional — passing null clears it back to
// "unassigned" rather than requiring every task to belong to one.
//
// Two plain queries rather than a doubly-nested embedded-resource filter
// (tasks -> requests -> clients) — same reasoning requests/actions.ts's
// requestBelongsToOrg() documents: simpler to be sure is correct than a
// two-level-deep !inner filter with no test coverage behind it.
export async function assignTaskToProject(taskId: string, projectId: string | null) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: task } = await admin.from("tasks").select("id, request_id").eq("id", taskId).maybeSingle();
  if (!task || !task.request_id) return { error: "Task not found." };

  const { data: request } = await admin.from("requests").select("id, client_id").eq("id", task.request_id).maybeSingle();
  if (!request) return { error: "Task not found." };

  const { data: client } = await admin.from("clients").select("id").eq("id", request.client_id).eq("org_id", orgId).maybeSingle();
  if (!client) return { error: "Task not found." };

  if (projectId) {
    const { data: project } = await admin.from("projects").select("id").eq("id", projectId).eq("org_id", orgId).maybeSingle();
    if (!project) return { error: "Project not found." };
  }

  const { error } = await admin.from("tasks").update({ project_id: projectId }).eq("id", taskId);
  if (error) return { error: "Failed to update the task." };

  revalidatePath("/studio/requests");
  revalidatePath("/studio/projects");
  return { ok: true as const };
}

// Projects Kanban Command Centre, Phase C1 -- the same allowlist bar
// sanitizeBlocksForWrite()'s isSafeHref() already enforces for Command
// Centre CTA hrefs (command-centre-layout.ts): a second real place user
// input becomes a rendered <a href>, both in Studio and, once the
// project reaches client_review, the client portal. Reject outright
// rather than half-trust -- no javascript:/data:/vbscript:/
// protocol-relative, and no bare http:// downgrade; a staging link/doc
// only ever needs to be a real https:// URL.
function isSafeDeliverableLink(value: string): boolean {
  return value.length <= 300 && /^https:\/\/[^\s]+$/i.test(value);
}

// Projects Kanban Command Centre, Phase C1 -- "Agency completes
// Deliverable" in Hamish's own delivery-chain wording: the staff submit
// flow behind /studio/projects/[id]'s new Deliverables section. Same
// ownership-check shape as createProjectTask above, plus the link_url
// allowlist. submitted_by is never user-entered -- set server-side from
// the acting session's own email, the same "attribution is the system's
// job, not a form field" shape audit_log.actor already uses everywhere
// else.
export async function createDeliverable(projectId: string, title: string, description: string | null, linkUrl: string | null) {
  const { orgId, email: actorEmail } = await requireOrgIdAndEmail();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { error: "Give the deliverable a title." };

  const trimmedLink = linkUrl?.trim() || null;
  if (trimmedLink && !isSafeDeliverableLink(trimmedLink)) return { error: "Link must be a real https:// URL." };

  const { data: project } = await admin.from("projects").select("id").eq("id", projectId).eq("org_id", orgId).maybeSingle();
  if (!project) return { error: "Project not found." };

  const { error } = await admin.from("deliverables").insert({
    org_id: orgId,
    project_id: projectId,
    title: trimmedTitle,
    description: description?.trim() || null,
    link_url: trimmedLink,
    submitted_by: actorEmail,
  });
  if (error) return { error: "Failed to submit the deliverable." };

  logAuditEvent({
    actor: actorEmail,
    actorType: "admin",
    action: "deliverable.submitted",
    targetType: "project",
    targetId: projectId,
    orgId,
    metadata: { title: trimmedTitle },
  });

  revalidatePath(`/studio/projects/${projectId}`);
  return { ok: true as const };
}

// Projects Kanban Command Centre, Phase C1 -- a small, deliberate addition
// beyond the original C1 ask (flagged in DECISIONS.md's matching design-
// pass entry): C1's own RLS already grants org-staff DELETE, and with no
// edit form in this phase (matching Tasks' own "no edit, just recreate"
// precedent), delete is the only real corrective path for a typo'd link
// or a wrong submission. Ownership verified via deliverables.org_id
// directly (set at insert time above), same one-query shape as
// deleteProject's own check.
export async function deleteDeliverable(deliverableId: string) {
  const { orgId, email: actorEmail } = await requireOrgIdAndEmail();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: deliverable } = await admin
    .from("deliverables")
    .select("id, project_id, title")
    .eq("id", deliverableId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!deliverable) return { error: "Deliverable not found." };

  const { error } = await admin.from("deliverables").delete().eq("id", deliverableId);
  if (error) return { error: "Failed to delete the deliverable." };

  logAuditEvent({
    actor: actorEmail,
    actorType: "admin",
    action: "deliverable.deleted",
    targetType: "project",
    targetId: deliverable.project_id,
    orgId,
    metadata: { title: deliverable.title },
  });

  revalidatePath(`/studio/projects/${deliverable.project_id}`);
  return { ok: true as const };
}

// Studio big-ticket ("no delete for projects/website-builder projects")
// — the exact "a typo'd name or duplicate stuck around forever" bug
// this session already fixed for campaigns (deleteCampaign(),
// campaigns/actions.ts), never extended to projects. Same
// "unassign, don't cascade-delete" shape for the one real child
// relationship: tasks.project_id is nullable (schema-projects.sql),
// a task belongs to its request first and a project only optionally,
// so unassigning rather than deleting keeps the request/task itself
// intact.
export async function deleteProject(projectId: string) {
  const { orgId, email: actorEmail } = await requireOrgIdAndEmail();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: project } = await admin.from("projects").select("id, name").eq("id", projectId).eq("org_id", orgId).maybeSingle();
  if (!project) return { error: "Project not found." };

  await admin.from("tasks").update({ project_id: null }).eq("project_id", projectId);

  const { error } = await admin.from("projects").delete().eq("id", projectId);
  if (error) return { error: "Failed to delete the project." };

  // Same gap the design spec's Phase A entry flagged for project.created
  // — deletion was never actually logged despite the assumption it was
  // (only project.assigned/unassigned are). One-line fix, same shape as
  // every sibling action in this file.
  logAuditEvent({
    actor: actorEmail,
    actorType: "admin",
    action: "project.deleted",
    targetType: "project",
    targetId: projectId,
    orgId,
    metadata: { name: project.name },
  });

  revalidatePath("/studio/projects");
  revalidatePath("/studio/requests");
  return { ok: true as const };
}
