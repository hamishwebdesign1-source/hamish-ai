"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateWebsiteBrief, WEBSITE_OBJECTIVES, SITEMAP_PAGE_OPTIONS, type WebsiteBrief, type WebsiteDiscovery } from "@/lib/website-brief";
import { generateBuildPhaseGroup, BUILD_PHASE_ORDER, type BuildPhase } from "@/lib/website-build-phases";
import { generateTroubleshootingHelp, type TroubleshootingEntry } from "@/lib/website-troubleshooting";
import { uploadWebsiteProjectFile, deleteWebsiteProjectFile, FILE_KINDS, MAX_FILES_PER_PROJECT, type FileKind } from "@/lib/website-project-files";
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
  } = await getUserWithRetry(supabase);
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
  eventType: "website_brief_generated" | "website_build_prompt_generated" | "website_troubleshooting_generated"
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
//
// WB9 rewrite — generation is now genuinely incremental: each phase is
// generated AND saved to build_phases the moment it's ready, so Phase 1
// is real, saved, and actionable within ~20-40s instead of the agency
// staring at a spinner for several minutes while all 10 generate before
// any of them are usable. Two actions, not three: startBuildPhaseGeneration()
// resets the project to a fresh, empty, in-progress generation (called
// once, only when starting from phase 0 — never on a resume from
// failure, which continues the same in-progress run); generateNextBuildPhase()
// determines the next phase from the project's own build_phases length
// (server-authoritative, not a client-passed index — can't desync
// across tabs) and appends it. Still one phase per Server Action call,
// still strictly sequential (Vercel Hobby's 60s cap and the real finding
// that "parallel" calls don't actually run concurrently on this plan —
// see website-build-phases.ts's file header — haven't changed).
//
// The usage event now records at start, not at completion — a
// deliberate change from the old batch design. Partial generation
// (stop after phase 3, walk away) is now a normal, expected outcome
// rather than only a failure path, and each phase still costs real
// Anthropic spend regardless of whether the run is ever "finished" — so
// charging at the point the agency commits to a generation run is the
// only version of this that can't be repeated for free by starting and
// abandoning forever.

// Resets the project to a fresh, empty, in-progress generation.
// current_phase_index only gets reset here — nowhere else touches it
// during generation, so a phase landing while the agency has already
// started working through Phase 1 (or beyond) never wipes their
// progress. Only ever called for fromIndex === 0 (a genuine fresh start
// or explicit "Regenerate all"), never for a resume-from-failure.
export async function startBuildPhaseGeneration(projectId: string): Promise<{ error: string } | { ok: true }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: project } = await admin.from("website_projects").select("brief, recommended_tool").eq("id", projectId).eq("org_id", orgId).single();
  if (!project?.brief) return { error: "This project needs a brief before build instructions can be generated." };
  if (!project.recommended_tool) return { error: "Choose an AI coding tool first." };

  const usageCheck = await checkAiUsage(orgId, "website_build_prompt_generated");
  if (!usageCheck.allowed) return { error: aiUsageErrorMessage(usageCheck) };

  const { error } = await admin
    .from("website_projects")
    .update({ build_phases: [], build_phases_generated_at: null, current_phase_index: 0, stage: "build" })
    .eq("id", projectId)
    .eq("org_id", orgId);
  if (error) return { error: "Failed to start generating." };

  if (!usageCheck.isInternal) await recordUsageEvent(orgId, "website_build_prompt_generated");

  revalidatePath(`/studio/website-builder/${projectId}`);
  return { ok: true as const };
}

// Generates exactly the next phase the project's own build_phases array
// says is missing, and appends it — the only write this makes to
// build_phases, current_phase_index untouched. Safe to call repeatedly
// (a resume just calls this again; the array length is what determines
// where it picks up, not anything the client remembers).
export async function generateNextBuildPhase(projectId: string): Promise<{ error: string } | { ok: true; phase: BuildPhase; isLastPhase: boolean }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: project } = await admin
    .from("website_projects")
    .select("brief, recommended_tool, build_phases")
    .eq("id", projectId)
    .eq("org_id", orgId)
    .single();
  if (!project?.brief) return { error: "This project needs a brief before build instructions can be generated." };
  if (!project.recommended_tool) return { error: "Choose an AI coding tool first." };

  const existing = Array.isArray(project.build_phases) ? (project.build_phases as BuildPhase[]) : [];
  const nextPhaseId = BUILD_PHASE_ORDER[existing.length];
  if (!nextPhaseId) return { error: "All phases are already generated." };

  const result = await generateBuildPhaseGroup(project.brief as WebsiteBrief, project.recommended_tool as ToolId, [nextPhaseId]);
  if ("error" in result) return { error: result.error };

  const phase = result.phases[0];
  const nextPhases = [...existing, phase];
  const isLastPhase = nextPhases.length === BUILD_PHASE_ORDER.length;

  const { error } = await admin
    .from("website_projects")
    .update({ build_phases: nextPhases, ...(isLastPhase ? { build_phases_generated_at: new Date().toISOString() } : {}) })
    .eq("id", projectId)
    .eq("org_id", orgId);
  if (error) return { error: "Generated but failed to save — try again." };

  revalidatePath(`/studio/website-builder/${projectId}`);
  return { ok: true as const, phase, isLastPhase };
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
//
// current_phase_index is allowed to reach BUILD_PHASE_ORDER.length (one
// past the last valid index, not capped at length-1) — that's the real
// signal "every phase is done." Capping it at length-1 was a genuine
// bug: the final phase's own "Finish" click would recompute the same
// index it was already at, so it could never actually render as done.
// WB3's launch panel appears once the index reaches this value.
//
// WB9: the ceiling is BUILD_PHASE_ORDER.length (the true total, always
// 10), not phases.length — since generation is now incremental,
// phases.length can genuinely be less than 10 while the agency is still
// working through Phase 1 and later phases are still being written.
// Advancing into a phase that hasn't been generated yet is refused with
// a real error rather than silently treating "not generated yet" as
// "every phase is done" (which phases.length as the ceiling would have
// done the moment only 1 of 10 phases existed).
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

  const nextIndex = Math.min(currentIndex + 1, BUILD_PHASE_ORDER.length);
  if (nextIndex < BUILD_PHASE_ORDER.length && nextIndex >= phases.length) {
    return { error: "The next phase is still being written — wait a moment and try again." };
  }

  // Once the agency reaches the QA phase (or anything after it), the
  // project is genuinely in its quality-checking/finishing stretch —
  // real signal for the stage tracker, not just "still building."
  // 'launched' is reserved for the explicit launchWebsiteProject()
  // action below; reaching the end of the phase list alone doesn't
  // claim the site is actually live.
  const qaIndex = BUILD_PHASE_ORDER.indexOf("qa");
  const nextStage = nextIndex >= qaIndex ? "qa" : "build";

  const { error } = await admin.from("website_projects").update({ current_phase_index: nextIndex, stage: nextStage }).eq("id", projectId);
  if (error) return { error: "Failed to advance." };

  revalidatePath(`/studio/website-builder/${projectId}`);
  return { ok: true as const };
}

// AI Website Creation Guide, WB3 — the final stage. Deliberately just
// two real fields (§10-12 of the brief in miniature): where the site
// actually is, and whether analytics is connected — no fabricated
// "launch checklist" beyond what the QA phase's own checklist already
// covers. Editable after the fact (an agency can come back and fix a
// wrong URL), not a one-way door.
export async function launchWebsiteProject(projectId: string, liveUrl: string, analyticsConnected: boolean): Promise<{ error: string } | { ok: true }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const trimmedUrl = liveUrl.trim();
  if (!trimmedUrl) return { error: "Enter the live website URL." };
  if (!/^https:\/\/[^\s]+$/i.test(trimmedUrl)) return { error: "Enter a full https:// URL." };

  const { error } = await admin
    .from("website_projects")
    .update({ live_url: trimmedUrl, analytics_connected: analyticsConnected, stage: "launched" })
    .eq("id", projectId)
    .eq("org_id", orgId);
  if (error) return { error: "Failed to save." };

  revalidatePath(`/studio/website-builder/${projectId}`);
  revalidatePath("/studio/website-builder");
  return { ok: true as const };
}

// AI Website Creation Guide, WB5 — the troubleshooting composer (plan
// doc §12). The agency describes what's going wrong in plain language;
// this generates a diagnosis plus a ready-to-paste instruction for
// their coding tool, grounded in the real brief and (where relevant)
// the phase they're currently on. HamishAI never touches the site's
// actual code — same "you stay in charge of the build" boundary as
// everything else in this capability.
export async function getTroubleshootingHelp(projectId: string, issue: string): Promise<{ error: string } | { ok: true; entry: TroubleshootingEntry }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const trimmedIssue = issue.trim().slice(0, 2000);
  if (!trimmedIssue) return { error: "Describe what's going wrong first." };

  const { data: project } = await admin
    .from("website_projects")
    .select("brief, recommended_tool, build_phases, current_phase_index, troubleshooting_log")
    .eq("id", projectId)
    .eq("org_id", orgId)
    .single();
  if (!project?.brief) return { error: "This project needs a brief before troubleshooting help is available." };
  if (!project.recommended_tool) return { error: "Choose an AI coding tool first." };

  const usageCheck = await checkAiUsage(orgId, "website_troubleshooting_generated");
  if (!usageCheck.allowed) return { error: aiUsageErrorMessage(usageCheck) };

  const phases = project.build_phases as BuildPhase[] | null;
  const currentPhase = phases?.[project.current_phase_index] ?? null;

  const result = await generateTroubleshootingHelp(project.brief as WebsiteBrief, project.recommended_tool as ToolId, currentPhase, trimmedIssue);
  if ("error" in result) return { error: result.error };

  const entry: TroubleshootingEntry = {
    id: crypto.randomUUID(),
    issue: trimmedIssue,
    diagnosis: result.diagnosis,
    fixPrompt: result.fixPrompt,
    createdAt: new Date().toISOString(),
  };

  // Newest-last, capped at 20 entries so a long-running project's log
  // doesn't grow the jsonb column unbounded.
  const existingLog = Array.isArray(project.troubleshooting_log) ? (project.troubleshooting_log as TroubleshootingEntry[]) : [];
  const nextLog = [...existingLog, entry].slice(-20);

  const { error } = await admin.from("website_projects").update({ troubleshooting_log: nextLog }).eq("id", projectId);
  if (error) return { error: "Got an answer but failed to save it." };

  if (!usageCheck.isInternal) await recordUsageEvent(orgId, "website_troubleshooting_generated");

  revalidatePath(`/studio/website-builder/${projectId}`);
  return { ok: true as const, entry };
}

// AI Website Creation Guide, WB8 — real browser file uploads (plan doc
// §2). No AI call, no usage metering — this is plumbing, not an AI-cost
// surface. formData carries "file" (the File itself) and "kind" (one of
// FILE_KINDS); both re-validated here rather than trusted from the
// client, same instinct as everywhere else content crosses the wire.
export async function uploadProjectFile(projectId: string, formData: FormData): Promise<{ error: string } | { ok: true }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: project } = await admin.from("website_projects").select("id").eq("id", projectId).eq("org_id", orgId).single();
  if (!project) return { error: "Project not found." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file first." };

  const kindRaw = formData.get("kind");
  const kind: FileKind = typeof kindRaw === "string" && (FILE_KINDS as string[]).includes(kindRaw) ? (kindRaw as FileKind) : "other";

  const { count } = await admin
    .from("website_project_files")
    .select("id", { count: "exact", head: true })
    .eq("website_project_id", projectId);
  if ((count ?? 0) >= MAX_FILES_PER_PROJECT) return { error: `This project already has ${MAX_FILES_PER_PROJECT} files — delete one before adding another.` };

  const result = await uploadWebsiteProjectFile(orgId, projectId, file, kind);
  if ("error" in result) return { error: result.error };

  revalidatePath(`/studio/website-builder/${projectId}`);
  return { ok: true as const };
}

export async function deleteProjectFile(projectId: string, fileId: string): Promise<{ error: string } | { ok: true }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: file } = await admin
    .from("website_project_files")
    .select("id, storage_path")
    .eq("id", fileId)
    .eq("website_project_id", projectId)
    .eq("org_id", orgId)
    .single();
  if (!file) return { error: "File not found." };

  const storageResult = await deleteWebsiteProjectFile(file.storage_path);
  if ("error" in storageResult) return { error: storageResult.error };

  const { error } = await admin.from("website_project_files").delete().eq("id", fileId);
  if (error) return { error: "Removed from storage but failed to update the file list." };

  revalidatePath(`/studio/website-builder/${projectId}`);
  return { ok: true as const };
}
