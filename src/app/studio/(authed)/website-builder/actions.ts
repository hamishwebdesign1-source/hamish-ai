"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateWebsiteBrief, WEBSITE_OBJECTIVES, SITEMAP_PAGE_OPTIONS, type WebsiteDiscovery } from "@/lib/website-brief";
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
