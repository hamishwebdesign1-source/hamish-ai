"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { discoverLeads } from "@/lib/discover-leads";
import { researchLead } from "@/lib/research-lead";
import { draftWebsiteMockup } from "@/lib/draft-website-mockup";
import { buildIcp } from "@/lib/build-icp";
import { draftSalesKit } from "@/lib/draft-sales-kit";
import { getUsageStatus, recordUsageEvent, type UsageEventType } from "@/lib/usage-limits";
import { isStudioActionRateLimited } from "@/lib/chat-rate-limit";
import type { PlatformPlanSlug } from "@/lib/platform-plans";
import { trackServerEvent } from "@/lib/analytics";

// Every action here re-derives the caller's org from their own session
// rather than trusting an orgId argument from the client — Server Actions
// don't inherit a page's own auth check the way a nested layout does, so
// this re-applies the same "never trust the client for which tenant this
// is" rule the rest of /studio gets from its (authed) layout.
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

// Shared by every AI action in this file that isn't prospect discovery
// itself (discoverLeads() does its own equivalent checks internally —
// see runDiscovery() below for its own rate-limit call). HamishAI's own
// org is exempt from both checks, same is_internal branch every other
// usage/billing check in this app uses — not a separate special case.
//
// Rate-limited first, before the (slightly more expensive) monthly-usage
// query: burst protection and fair-use budgeting are different concerns
// — usage-limits.ts stops an org exceeding its plan over a month, this
// stops the same org firing a tight script loop within an otherwise-
// unexceeded month, which nothing before this session caught.
async function checkUsage(
  orgId: string,
  eventType: UsageEventType
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

function usageCheckErrorMessage(usageCheck: { rateLimited: true } | { rateLimited: false; used: number; limit: number }): string {
  if (usageCheck.rateLimited) return "You're doing that a lot right now — wait a few minutes and try again.";
  return `Monthly limit reached (${usageCheck.used} of ${usageCheck.limit}) — try again next month.`;
}

// Costs a real AI call, so gated behind requireOrgId() like everything
// else here even though it doesn't touch the database — an unauthenticated
// visitor shouldn't be able to spend the org's AI budget on ICP guesses.
// Returns the ICP for the client to show in a review step; saving it is a
// separate, existing updateProspectingConfig() call the user triggers
// explicitly (via the existing "Save niche" button), not automatic — the
// AI's interpretation should be reviewable before it's acted on.
//
// Usage-metered as of the platform readiness audit — this and the other
// two AI actions below had no cap at all before, unlike prospecting
// itself.
export async function generateIcp(description: string) {
  const orgId = await requireOrgId();
  const usageCheck = await checkUsage(orgId, "icp_built");
  if (!usageCheck.allowed) {
    return { error: usageCheckErrorMessage(usageCheck) };
  }

  const result = await buildIcp(description);
  if (!usageCheck.isInternal && "icp" in result) await recordUsageEvent(orgId, "icp_built");
  return result;
}

export async function updateProspectingConfig(input: { categories: string[]; areas: string[] }) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  // Merge rather than overwrite — prospecting_config also carries the
  // agencyType/services chosen during onboarding (platform-onboarding.ts),
  // and a settings update here shouldn't silently erase those.
  const { data: org } = await admin.from("organisations").select("prospecting_config").eq("id", orgId).single();
  const merged = { ...(org?.prospecting_config ?? {}), categories: input.categories, areas: input.areas };

  const { error } = await admin.from("organisations").update({ prospecting_config: merged }).eq("id", orgId);
  if (error) return { error: "Failed to save your prospecting settings." };

  revalidatePath("/studio/prospects");
  return { ok: true as const };
}

export async function runDiscovery() {
  const orgId = await requireOrgId();

  // Rate-limited here rather than inside discoverLeads() itself — that
  // function also runs from /api/cron/lead-discovery for HamishAI's own
  // org, which shouldn't be burst-protected against itself. discoverLeads()
  // already has its own monthly usage cap (checked internally, against
  // prospect_researched); this is the same burst-protection layer as
  // checkUsage() above, for the single most expensive Studio AI action
  // (multiple searches + a research call per candidate).
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data: org } = await admin.from("organisations").select("is_internal").eq("id", orgId).single();
    if (org && !org.is_internal && (await isStudioActionRateLimited(orgId))) {
      return { error: "You're doing that a lot right now — wait a few minutes and try again." };
    }
  }

  const result = await discoverLeads(orgId);
  if ("inserted" in result) await trackServerEvent(orgId, "discovery_run", { prospects_found: result.inserted.length });
  revalidatePath("/studio/prospects");
  return result;
}

// Manual trigger for a prospect discovery ran without researching
// (shouldn't happen going forward — discoverLeads() now researches every
// prospect it finds — but real for anything found before that fix, or as
// an explicit re-research after a prospect's website changes). Not
// usage-metered the way discovery itself is: the monthly cap is on
// finding prospects in the first place, not on re-checking one you
// already have.
export async function researchProspect(prospectId: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  // Confirmed against this caller's own org_id before spending an AI call
  // on it — researchLead() itself has no org concept at all, so this
  // check is the only thing stopping a tenant from researching another
  // org's prospect by id.
  const { data: prospect, error: prospectError } = await admin
    .from("prospects")
    .select("id")
    .eq("id", prospectId)
    .eq("org_id", orgId)
    .single();
  if (prospectError || !prospect) return { error: "Prospect not found." };

  const result = await researchLead(prospectId);
  revalidatePath("/studio/prospects");
  return result;
}

// The lightweight website-mockup generator (draft-website-mockup.ts) —
// same org-ownership check as researchProspect(), plus a lookup of the
// caller's own org name, since the mockup copy is written "on behalf of"
// that org and must never default to HamishAI's name for a real tenant.
export async function generateWebsiteMockup(prospectId: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: prospect, error: prospectError } = await admin
    .from("prospects")
    .select("id")
    .eq("id", prospectId)
    .eq("org_id", orgId)
    .single();
  if (prospectError || !prospect) return { error: "Prospect not found." };

  const usageCheck = await checkUsage(orgId, "website_mockup_generated");
  if (!usageCheck.allowed) {
    return { error: usageCheckErrorMessage(usageCheck) };
  }

  const { data: org } = await admin.from("organisations").select("name, is_internal").eq("id", orgId).single();
  const orgName = org && !org.is_internal ? org.name : "HamishAI";

  const result = await draftWebsiteMockup(prospectId, orgName);
  if (!usageCheck.isInternal && "mockup" in result) await recordUsageEvent(orgId, "website_mockup_generated");
  revalidatePath("/studio/prospects");
  return result;
}

// The full six-piece outreach kit (draft-sales-kit.ts), now genuinely
// tenant-safe — same org/prospect ownership check as generateWebsiteMockup(),
// resolving the caller's own org name and is_internal so the kit is
// written on their agency's behalf, not defaulted to Hamish's identity
// and hamishai.org proof points.
export async function generateSalesKit(prospectId: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: prospect, error: prospectError } = await admin
    .from("prospects")
    .select("id")
    .eq("id", prospectId)
    .eq("org_id", orgId)
    .single();
  if (prospectError || !prospect) return { error: "Prospect not found." };

  const usageCheck = await checkUsage(orgId, "sales_kit_generated");
  if (!usageCheck.allowed) {
    return { error: usageCheckErrorMessage(usageCheck) };
  }

  const { data: org } = await admin.from("organisations").select("name, is_internal").eq("id", orgId).single();
  const sender = org && !org.is_internal ? { name: org.name, isInternal: false } : { name: "Hamish AI", isInternal: true };

  const result = await draftSalesKit(prospectId, sender);
  if (!usageCheck.isInternal && "kit" in result) await recordUsageEvent(orgId, "sales_kit_generated");
  revalidatePath("/studio/prospects");
  return result;
}

// Mirrors /admin/(authed)/clients/page.tsx's addClient() exactly — same
// one-email-one-client rule, same client_members grant, same
// source_lead_id link back to where this client came from. The only real
// difference is org_id (this tenant's own, not HamishAI's) and that the
// email/business details come from a prospect row instead of a hand-typed
// form, since a tenant is converting something the platform already
// found, not entering a client from scratch.
export async function convertProspectToClient(prospectId: string, email: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const normalisedEmail = email.trim().toLowerCase();
  if (!normalisedEmail) return { error: "An email is required to give this client portal access." };

  const { data: existingElsewhere } = await admin
    .from("client_members")
    .select("client_id")
    .eq("email", normalisedEmail)
    .limit(1)
    .maybeSingle();
  if (existingElsewhere) {
    return { error: `${normalisedEmail} already has portal access to another client — one email can only belong to one client's portal.` };
  }

  // Confirmed against this caller's own org_id, not just the prospect's
  // id alone — never trust a client-supplied id to already be scoped
  // correctly, same rule as every other Server Action here.
  const { data: prospect, error: prospectError } = await admin
    .from("prospects")
    .select("business_name, website")
    .eq("id", prospectId)
    .eq("org_id", orgId)
    .single();
  if (prospectError || !prospect) return { error: "Prospect not found." };

  const { data: client, error: clientError } = await admin
    .from("clients")
    .insert({
      org_id: orgId,
      name: prospect.business_name,
      business_name: prospect.business_name,
      email: normalisedEmail,
      website_url: prospect.website || null,
      maintenance_plan: "none",
      source_lead_id: prospectId,
    })
    .select("id")
    .single();
  if (clientError || !client) {
    console.error("Failed to convert prospect to client:", clientError);
    return { error: "Failed to create the client." };
  }

  const { error: memberError } = await admin
    .from("client_members")
    .insert({ client_id: client.id, email: normalisedEmail, role: "owner", invited_by: "studio" });
  if (memberError) console.error("Failed to grant portal access on client creation:", memberError);

  await admin.from("prospects").update({ status: "converted" }).eq("id", prospectId);

  await trackServerEvent(orgId, "prospect_converted", { client_id: client.id });

  revalidatePath("/studio/prospects");
  revalidatePath("/studio/clients");
  return { ok: true as const, clientId: client.id };
}

// Follow-up tracking — direct port of /admin/leads' own cadence system
// (lead-status.ts, schema-lead-cadence.sql), which already reads as a
// pure function over {status, contacted_at, last_contact_method,
// replied_at} with no HamishAI-specific logic in it at all. Nothing new
// to invent here, just a tenant-scoped way to set the same fields.
//
// Manual, not automated — see the reply on hooking up a tenant's own
// inbox: that's a real, separate, much bigger feature (multi-tenant
// OAuth, Google app verification, per-org token storage), not something
// this action set silently grows into.
export async function markProspectContacted(prospectId: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { error } = await admin
    .from("prospects")
    .update({ status: "contacted", contacted_at: new Date().toISOString(), last_contact_method: "email" })
    .eq("id", prospectId)
    .eq("org_id", orgId);
  if (error) return { error: "Failed to mark as contacted." };

  revalidatePath("/studio/prospects");
  return { ok: true as const };
}

export async function markProspectReplied(prospectId: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { error } = await admin
    .from("prospects")
    .update({ replied_at: new Date().toISOString() })
    .eq("id", prospectId)
    .eq("org_id", orgId);
  if (error) return { error: "Failed to mark as replied." };

  revalidatePath("/studio/prospects");
  return { ok: true as const };
}

// Platform readiness audit P1: a real pipeline beyond the original three
// statuses (needs_verification -> contacted -> converted), which had no
// room for "we reviewed this and it's worth pursuing" or "we pursued
// this and it didn't work out" — a prospect either sat forever or
// disappeared into "converted," with nothing for the (normal, common)
// outcome of a lead simply not going anywhere. No CHECK constraint on
// prospects.status (schema-leads.sql), so these two new values need no
// migration of their own — deliberately not renaming "converted" to
// "won" alongside them, since that value is load-bearing across this
// file, RemoveProspectControl, and ConvertToClientControl already, and
// renaming it for cosmetic consistency risks a real bug for no real
// benefit.
export async function markProspectQualified(prospectId: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { error } = await admin
    .from("prospects")
    .update({ status: "qualified" })
    .eq("id", prospectId)
    .eq("org_id", orgId);
  if (error) return { error: "Failed to mark as qualified." };

  revalidatePath("/studio/prospects");
  return { ok: true as const };
}

export async function markProspectLost(prospectId: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { error } = await admin
    .from("prospects")
    .update({ status: "lost" })
    .eq("id", prospectId)
    .eq("org_id", orgId);
  if (error) return { error: "Failed to mark as lost." };

  revalidatePath("/studio/prospects");
  return { ok: true as const };
}

// A tenant's own estimate of what this prospect is worth if it converts —
// entirely optional (null is a valid, common state: "haven't sized this
// one yet"), never AI-generated, since a made-up deal value dressed up as
// a real number would be worse than no number at all.
export async function updateProspectDealValue(prospectId: string, poundsValue: number | null) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const pence = poundsValue !== null && poundsValue > 0 ? Math.round(poundsValue * 100) : null;

  const { error } = await admin
    .from("prospects")
    .update({ deal_value_pence: pence })
    .eq("id", prospectId)
    .eq("org_id", orgId);
  if (error) return { error: "Failed to save the deal value." };

  revalidatePath("/studio/prospects");
  return { ok: true as const };
}

// A converted prospect can't be removed — it's now a client
// (clients.source_lead_id references this row), and deleting it would
// either fail on that foreign key or, worse, silently orphan the client's
// "where this came from" link. ConvertToClientControl already never shows
// a remove option for one; this is the server-side backstop for that,
// same belt-and-braces rule as every ownership check in this file.
//
// research_jobs and lead_meetings both reference prospect_id with no
// cascade — cleared explicitly first so the delete itself can't fail on
// either, even though neither pipeline is one Studio prospects normally
// pass through today.
export async function deleteProspect(prospectId: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: prospect, error: prospectError } = await admin
    .from("prospects")
    .select("id, status")
    .eq("id", prospectId)
    .eq("org_id", orgId)
    .single();
  if (prospectError || !prospect) return { error: "Prospect not found." };
  if (prospect.status === "converted") {
    return { error: "Converted prospects can't be removed — they're now a client." };
  }

  await admin.from("research_jobs").delete().eq("prospect_id", prospectId);
  await admin.from("lead_meetings").delete().eq("prospect_id", prospectId);

  const { error } = await admin.from("prospects").delete().eq("id", prospectId).eq("org_id", orgId);
  if (error) return { error: "Failed to remove prospect." };

  revalidatePath("/studio/prospects");
  return { ok: true as const };
}
