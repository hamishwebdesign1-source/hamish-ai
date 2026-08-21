"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateWebsiteBrief, WEBSITE_OBJECTIVES, SITEMAP_PAGE_OPTIONS, type WebsiteBrief, type WebsiteDiscovery } from "@/lib/website-brief";
import { generateBuildPhaseGroup, PHASE_GROUPS, BUILD_PHASE_ORDER, type BuildPhase } from "@/lib/website-build-phases";
import { recommendTool, AI_CODING_TOOLS, type ToolId, type ToolQuizAnswers } from "@/lib/ai-coding-tools";
import { getUsageStatus, recordUsageEvent } from "@/lib/usage-limits";
import { isStudioActionRateLimited } from "@/lib/chat-rate-limit";
import type { PlatformPlanSlug } from "@/lib/platform-plans";

// Same session-derivation as every other Studio actions.ts file this
// session — kept as its own local copy, same convention settings/actions.ts
// documents.
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

// Same usage/rate-limit discipline as every other Studio AI Server
// Action (prospects/actions.ts's own checkUsage(), settings/actions.ts's
// own checkAiUsage()) — kept as its own local copy, same convention. The
// brief generator is a real AI-cost surface, not exempt.
async function checkAiUsage(
  orgId: string,
  eventType: "website_brief_generated" | "website_build_prompt_generated"
): Promise<
  | { allowed: true; isInternal: boolean }
  | { allowed: false; isInternal: false; rateLimited: true }
  | { allowed: false; isInternal: false; rateLimited: false; used: number; limit: number }
> {
  const admin = getSupabaseAdmin();
  if (!admin) return { allowed: true, isInternal: false };

  const { data: org } = await admin.from("organisations").select("plan, is_internal").eq("id", orgId).single();
  if (!org || org.is_internal) return { allowed: true, isInternal: true };

  if (await isStudioActionRateLimited(orgId)) return { allowed: false, isInternal: false, rateLimited: true };

  const usage = await getUsageStatus(orgId, eventType, org.plan as PlatformPlanSlug);
  if (!usage.allowed) return { allowed: false, isInternal: false, rateLimited: false, used: usage.used, limit: usage.limit };
  return { allowed: true, isInternal: false };
}

function aiUsageErrorMessage(usageCheck: { rateLimited: true } | { rateLimited: false; used: number; limit: number }): string {
  if (usageCheck.rateLimited) return "You're doing that a lot right now — wait a few minutes and try again.";
  return `Monthly limit reached (${usageCheck.used} of ${usageCheck.limit}) — try again next month.`;
}

function sanitizeDiscovery(input: Partial<WebsiteDiscovery>): WebsiteDiscovery {
  const objectives = Array.isArray(input.objectives) ? input.objectives.filter((o) => (WEBSITE_OBJECTIVES as readonly string[]).includes(o)) : [];
  const sitemapPages = Array.isArray(input.sitemapPages) ? input.sitemapPages.filter((p) => (SITEMAP_PAGE_OPTIONS as readonly string[]).includes(p)) : [];
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  return {
    businessName: text(input.businessName, 200),
    industry: text(input.industry, 200),
    location: text(input.location, 200),
    targetAudience: text(input.targetAudience, 500),
    servicesProducts: text(input.servicesProducts, 1000),
    usps: text(input.usps, 1000),
    objectives,
    sitemapPages,
    designStyle: text(input.designStyle, 500),
    designColours: text(input.designColours, 300),
    designFonts: text(input.designFonts, 300),
    designExamples: text(input.designExamples, 500),
    existingWebsiteUrl: text(input.existingWebsiteUrl, 300),
    contentNotes: text(input.contentNotes, 2000),
  };
}

// Creates the project and immediately generates the first brief — the
// discovery wizard's whole point is to produce a brief, so there's no
// real value in a separate "now click Generate" step right after
// submitting the wizard. Redirects into the project on success so the
// caller doesn't have to.
export async function createWebsiteProject(clientId: string, discoveryInput: Partial<WebsiteDiscovery>) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: client } = await admin.from("clients").select("id").eq("id", clientId).eq("org_id", orgId).single();
  if (!client) return { error: "Client not found." };

  const discovery = sanitizeDiscovery(discoveryInput);
  if (!discovery.businessName) return { error: "Business name is required." };

  const usageCheck = await checkAiUsage(orgId, "website_brief_generated");
  if (!usageCheck.allowed) return { error: aiUsageErrorMessage(usageCheck) };

  const { data: project, error: insertError } = await admin
    .from("website_projects")
    .insert({ org_id: orgId, client_id: clientId, discovery, stage: "discovery" })
    .select("id")
    .single();
  if (insertError || !project) return { error: "Failed to create the project." };

  const result = await generateWebsiteBrief(discovery);
  if ("error" in result) {
    // The project still exists with real discovery answers even if the
    // brief call itself failed — the detail page's own "Generate brief"
    // button covers retrying, so this isn't a dead end.
    revalidatePath("/studio/website-builder");
    redirect(`/studio/website-builder/${project.id}`);
  }

  await admin
    .from("website_projects")
    .update({ brief: result.brief, brief_generated_at: new Date().toISOString(), stage: "brief" })
    .eq("id", project.id);
  if (!usageCheck.isInternal) await recordUsageEvent(orgId, "website_brief_generated");

  revalidatePath("/studio/website-builder");
  redirect(`/studio/website-builder/${project.id}`);
}

// Explicit regenerate — same "never auto-regenerate, only on a deliberate
// click" convention as draft-sales-kit.ts, since this is a real AI call
// with a real usage cost, not something to fire on every page view.
export async function regenerateWebsiteBrief(projectId: string): Promise<{ error: string } | { ok: true }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: project } = await admin.from("website_projects").select("discovery").eq("id", projectId).eq("org_id", orgId).single();
  if (!project?.discovery) return { error: "Project not found." };

  const usageCheck = await checkAiUsage(orgId, "website_brief_generated");
  if (!usageCheck.allowed) return { error: aiUsageErrorMessage(usageCheck) };

  const result = await generateWebsiteBrief(project.discovery as WebsiteDiscovery);
  if ("error" in result) return { error: result.error };

  const { error } = await admin
    .from("website_projects")
    .update({ brief: result.brief, brief_generated_at: new Date().toISOString(), stage: "brief" })
    .eq("id", projectId);
  if (error) return { error: "Brief generated but failed to save." };

  if (!usageCheck.isInternal) await recordUsageEvent(orgId, "website_brief_generated");

  revalidatePath(`/studio/website-builder/${projectId}`);
  return { ok: true as const };
}

// Deterministic, not an AI call — recommendTool() is a plain decision
// tree over real tool data (ai-coding-tools.ts), free to run as often as
// someone changes their answers. Saves the recommendation as the
// project's tool choice; confirmWebsiteTool() below lets the agency
// override it without re-running the quiz.
export async function chooseWebsiteTool(
  projectId: string,
  answers: ToolQuizAnswers
): Promise<{ error: string } | { ok: true; toolId: ToolId; reason: string }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: project } = await admin.from("website_projects").select("id").eq("id", projectId).eq("org_id", orgId).single();
  if (!project) return { error: "Project not found." };

  const recommendation = recommendTool(answers);
  const { error } = await admin
    .from("website_projects")
    .update({ tool_quiz_answers: answers, recommended_tool: recommendation.toolId, stage: "tool" })
    .eq("id", projectId);
  if (error) return { error: "Failed to save your answers." };

  revalidatePath(`/studio/website-builder/${projectId}`);
  return { ok: true as const, toolId: recommendation.toolId, reason: recommendation.reason };
}

// Confirms which tool to actually build with — defaults to whatever the
// quiz recommended, but the agency can pick any of the three regardless
// (§9 recommends, never forces).
export async function confirmWebsiteTool(projectId: string, toolId: ToolId): Promise<{ error: string } | { ok: true }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  if (!(toolId in AI_CODING_TOOLS)) return { error: "Unknown tool." };

  const { error } = await admin.from("website_projects").update({ recommended_tool: toolId, stage: "tool" }).eq("id", projectId).eq("org_id", orgId);
  if (error) return { error: "Failed to save your choice." };

  revalidatePath(`/studio/website-builder/${projectId}`);
  return { ok: true as const };
}

// The technical heart of the whole capability (§4-5) — real,
// phase-by-phase build instructions from the brief + confirmed tool.
// Split into 3 Server Actions rather than 1, purely because of a real
// platform constraint: this app runs on Vercel's Hobby plan (confirmed
// directly with the user), which caps a serverless function at 60
// seconds, and generating all 10 phases in a single call was
// live-tested at 90-150 seconds. Generating one group per Server Action
// keeps each call comfortably inside that budget; the client
// (build-phase-panel.tsx) fires all of PHASE_GROUPS in parallel, then
// calls saveWebsiteBuildPhases() once with the combined result — never
// two of these writing to the same jsonb column concurrently.

// Checked once before the client fires off the parallel group calls —
// each group call also re-checks (see below) since a Server Action is
// technically callable directly, but the up-front check is what the UI
// actually gates on.
export async function canGenerateWebsitePhases(projectId: string): Promise<{ error: string } | { ok: true }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: project } = await admin.from("website_projects").select("brief, recommended_tool").eq("id", projectId).eq("org_id", orgId).single();
  if (!project?.brief) return { error: "This project needs a brief before build instructions can be generated." };
  if (!project.recommended_tool) return { error: "Choose an AI coding tool first." };

  const usageCheck = await checkAiUsage(orgId, "website_build_prompt_generated");
  if (!usageCheck.allowed) return { error: aiUsageErrorMessage(usageCheck) };

  return { ok: true as const };
}

// Generates exactly one group from PHASE_GROUPS — read-only, never
// writes to the database itself, so several of these can safely run in
// parallel without racing each other over the same row.
export async function generateWebsitePhaseGroup(projectId: string, groupIndex: number): Promise<{ error: string } | { ok: true; phases: BuildPhase[] }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const group = PHASE_GROUPS[groupIndex];
  if (!group) return { error: "Invalid phase group." };

  const { data: project } = await admin.from("website_projects").select("brief, recommended_tool").eq("id", projectId).eq("org_id", orgId).single();
  if (!project?.brief) return { error: "This project needs a brief before build instructions can be generated." };
  if (!project.recommended_tool) return { error: "Choose an AI coding tool first." };

  const usageCheck = await checkAiUsage(orgId, "website_build_prompt_generated");
  if (!usageCheck.allowed) return { error: aiUsageErrorMessage(usageCheck) };

  const result = await generateBuildPhaseGroup(project.brief as WebsiteBrief, project.recommended_tool as ToolId, group);
  if ("error" in result) return { error: result.error };
  return { ok: true as const, phases: result.phases };
}

// The one write, called once by the client after all groups have
// resolved — combines them into the full 10-phase array, validates
// coverage, and records the single usage event for the whole
// generation (one user-initiated action, one usage event, regardless of
// how many API calls it took internally).
export async function saveWebsiteBuildPhases(projectId: string, phases: BuildPhase[]): Promise<{ error: string } | { ok: true }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const ids = new Set(phases.map((p) => p.id));
  if (!BUILD_PHASE_ORDER.every((id) => ids.has(id))) return { error: "Incomplete build instructions — try generating again." };

  const { data: org } = await admin.from("organisations").select("is_internal").eq("id", orgId).single();

  const { error } = await admin
    .from("website_projects")
    .update({ build_phases: phases, build_phases_generated_at: new Date().toISOString(), current_phase_index: 0, stage: "build" })
    .eq("id", projectId)
    .eq("org_id", orgId);
  if (error) return { error: "Build instructions generated but failed to save." };

  if (!org?.is_internal) await recordUsageEvent(orgId, "website_build_prompt_generated");

  revalidatePath(`/studio/website-builder/${projectId}`);
  return { ok: true as const };
}

// Flips one checklist item within the currently-active phase. Reads,
// mutates, writes back the whole build_phases array — same pattern as
// every other jsonb array this session (Command Centre's block canvas),
// re-validated against BUILD_PHASE_ORDER rather than trusted structurally.
export async function toggleChecklistItem(projectId: string, phaseId: string, itemIndex: number): Promise<{ error: string } | { ok: true }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  if (!BUILD_PHASE_ORDER.includes(phaseId as (typeof BUILD_PHASE_ORDER)[number])) return { error: "Unknown phase." };

  const { data: project } = await admin.from("website_projects").select("build_phases").eq("id", projectId).eq("org_id", orgId).single();
  const phases = project?.build_phases as BuildPhase[] | null;
  if (!phases) return { error: "Project not found." };

  const phase = phases.find((p) => p.id === phaseId);
  if (!phase || !phase.checklist[itemIndex]) return { error: "Checklist item not found." };

  const nextPhases = phases.map((p) =>
    p.id === phaseId ? { ...p, checklist: p.checklist.map((c, i) => (i === itemIndex ? { ...c, done: !c.done } : c)) } : p
  );

  const { error } = await admin.from("website_projects").update({ build_phases: nextPhases }).eq("id", projectId);
  if (error) return { error: "Failed to save." };

  revalidatePath(`/studio/website-builder/${projectId}`);
  return { ok: true as const };
}

// Only advances if the current phase's checklist is genuinely complete
// — re-checked server-side rather than trusting the client's own gating,
// same "don't trust the UI state, re-verify" instinct as everywhere else
// AI-cost or state-progression matters in this app.
export async function advanceBuildPhase(projectId: string): Promise<{ error: string } | { ok: true }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: project } = await admin
    .from("website_projects")
    .select("build_phases, current_phase_index")
    .eq("id", projectId)
    .eq("org_id", orgId)
    .single();
  const phases = project?.build_phases as BuildPhase[] | null;
  if (!phases) return { error: "Project not found." };

  const currentIndex = project?.current_phase_index ?? 0;
  const currentPhase = phases[currentIndex];
  if (!currentPhase) return { error: "Invalid phase." };
  if (!currentPhase.checklist.every((c) => c.done)) return { error: "Complete this phase's checklist first." };

  const nextIndex = Math.min(currentIndex + 1, phases.length - 1);
  const { error } = await admin.from("website_projects").update({ current_phase_index: nextIndex }).eq("id", projectId);
  if (error) return { error: "Failed to advance." };

  revalidatePath(`/studio/website-builder/${projectId}`);
  return { ok: true as const };
}
