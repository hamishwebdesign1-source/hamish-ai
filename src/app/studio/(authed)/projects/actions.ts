"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit-log";

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

// P1 platform readiness item — lightweight project tracking. A project is
// just a named deliverable against one of this org's own clients, with an
// optional target date. No RLS backstop on the writes below (service-role
// client, same as every other Studio Server Action) — schema-rls-projects-org-staff.sql's
// SELECT policy is what protects the read side.
export async function createProject(clientId: string, name: string, targetDate: string | null) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const trimmedName = name.trim();
  if (!trimmedName) return { error: "Give the project a name." };

  const { data: client } = await admin.from("clients").select("id").eq("id", clientId).eq("org_id", orgId).maybeSingle();
  if (!client) return { error: "Client not found." };

  const { error } = await admin
    .from("projects")
    .insert({ org_id: orgId, client_id: clientId, name: trimmedName, target_date: targetDate || null });
  if (error) return { error: "Failed to create the project." };

  revalidatePath("/studio/projects");
  revalidatePath("/studio/requests");
  return { ok: true as const };
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

// Studio big-ticket ("team collaboration") — who's actually delivering
// this project, same real slice requests/actions.ts's assignRequest()
// and prospects/actions.ts's assignProspect() already ship.
export async function assignProject(projectId: string, assigneeEmail: string | null) {
  const { orgId, email: actorEmail } = await requireOrgIdAndEmail();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: project } = await admin.from("projects").select("id").eq("id", projectId).eq("org_id", orgId).maybeSingle();
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

  revalidatePath("/studio/projects");
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
