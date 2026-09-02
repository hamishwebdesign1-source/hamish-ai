"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { discoverLeads, searchProspectsNow } from "@/lib/discover-leads";
import { researchLead } from "@/lib/research-lead";
import { draftWebsiteMockup } from "@/lib/draft-website-mockup";
import { buildIcp } from "@/lib/build-icp";
import { draftSalesKit, type SalesKit } from "@/lib/draft-sales-kit";
import { findAgencyType } from "@/lib/agency-types";
import { getUsageStatus, recordUsageEvent, type UsageEventType } from "@/lib/usage-limits";
import { isStudioActionRateLimited } from "@/lib/chat-rate-limit";
import type { PlatformPlanSlug } from "@/lib/platform-plans";
import { trackServerEvent } from "@/lib/analytics";
import { sendOrgEmail } from "@/lib/send-org-email";
import { sendClientEmail } from "@/lib/send-client-email";
import { createProposalToken } from "@/lib/proposal-tokens";
import { renderProposalPdf } from "@/lib/proposal-pdf";
import type { RateCardItem } from "@/lib/rate-card";
import { logAuditEvent } from "@/lib/audit-log";
import { notifyAssignee } from "@/lib/team-members";
import { logAiCall } from "@/lib/ai-call-log";

// Every action here re-derives the caller's org from their own session
// rather than trusting an orgId argument from the client — Server Actions
// don't inherit a page's own auth check the way a nested layout does, so
// this re-applies the same "never trust the client for which tenant this
// is" rule the rest of /studio gets from its (authed) layout.
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

  const startedAt = Date.now();
  const result = await buildIcp(description);
  logAiCall(orgId, "icp_builder", { success: "icp" in result, latencyMs: Date.now() - startedAt });
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
    const { data: org } = await admin.from("organisations").select("is_internal, plan").eq("id", orgId).single();
    if (org && !org.is_internal && (await isStudioActionRateLimited(orgId, org.plan as PlatformPlanSlug))) {
      return { error: "You're doing that a lot right now — wait a few minutes and try again." };
    }
  }

  const result = await discoverLeads(orgId);
  if ("inserted" in result) await trackServerEvent(orgId, "discovery_run", { prospects_found: result.inserted.length });
  revalidatePath("/studio/prospects");
  return result;
}

// The direct "search this, right now" action runDiscovery() above never
// was — see searchProspectsNow()'s own comment. Same rate-limit gate as
// runDiscovery(): this is the same class of expensive Studio AI action
// (multiple web searches plus a research call per candidate found), so
// it shares the burst-protection layer rather than getting its own.
export async function searchProspects(location: string, category: string) {
  const orgId = await requireOrgId();

  const admin = getSupabaseAdmin();
  if (admin) {
    const { data: org } = await admin.from("organisations").select("is_internal, plan").eq("id", orgId).single();
    if (org && !org.is_internal && (await isStudioActionRateLimited(orgId, org.plan as PlatformPlanSlug))) {
      return { error: "You're doing that a lot right now — wait a few minutes and try again." };
    }
  }

  const result = await searchProspectsNow(orgId, location, category.trim() || null);
  if ("inserted" in result) await trackServerEvent(orgId, "on_demand_search_run", { prospects_found: result.inserted.length });
  revalidatePath("/studio/prospects");
  return result;
}

// Real gap, reported live: every prospect before this action existed came
// from AI discovery only (discoverLeads()/searchProspectsNow() above) —
// a tenant's own inbound enquiry, referral, or trade-show contact had
// nowhere to go inside Studio at all. No AI call here, so no usage cap
// or rate limit (compare runDiscovery()/searchProspects() above, both
// gated on the same checks this deliberately skips) — this is a single
// insert into the same prospects table discovery uses, so a manually
// added lead gets the exact same downstream pipeline for free: status,
// deal value, sales kit generation, conversion to client.
//
// discovery_source and score/score_breakdown are deliberately left null
// — that's an honest reflection of "nothing AI-found or AI-scored this",
// not a bug; the prospect list already renders a null score as no score
// badge at all rather than a misleading 0 (same "real data or nothing"
// discipline as the Business Health / Engagement Risk fixes this
// session). status defaults to "qualified" rather than
// "needs_verification" — that status means "AI found this, hasn't been
// confirmed yet", which doesn't apply to a lead the tenant typed in and
// is vouching for themselves. Optional research afterwards reuses the
// existing researchProspect() action above, uncapped, exactly like
// re-researching an old discovery-found prospect today.
export async function addManualProspect(input: {
  businessName: string;
  email?: string;
  phone?: string;
  category?: string;
  neighbourhood?: string;
  website?: string;
}) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const businessName = input.businessName.trim();
  if (!businessName) return { error: "Business name is required." };

  const { error } = await admin.from("prospects").insert({
    org_id: orgId,
    business_name: businessName,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    category: input.category?.trim() || null,
    neighbourhood: input.neighbourhood?.trim() || null,
    website: input.website?.trim() || null,
    status: "qualified",
  });
  if (error) return { error: "Failed to add prospect." };

  revalidatePath("/studio/prospects");
  return { ok: true as const };
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

  // Studio big-ticket ("Model Performance completeness") — timed around
  // the whole call rather than threaded deep into researchLead() itself
  // (shared with /admin, which has no org concept at all to log
  // against) — same reasoning generateWebsiteMockup()/generateIcp()
  // below apply. "success" is the same shape check the caller already
  // uses to decide whether usage quota was actually spent.
  const startedAt = Date.now();
  const result = await researchLead(prospectId);
  logAiCall(orgId, "prospect_research", { success: "research" in result, latencyMs: Date.now() - startedAt });
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

  const startedAt = Date.now();
  const result = await draftWebsiteMockup(prospectId, orgName);
  logAiCall(orgId, "website_mockup", { success: "mockup" in result, latencyMs: Date.now() - startedAt });
  if (!usageCheck.isInternal && "mockup" in result) await recordUsageEvent(orgId, "website_mockup_generated");
  revalidatePath("/studio/prospects");
  return result;
}

// The full six-piece outreach kit (draft-sales-kit.ts), now genuinely
// tenant-safe — same org/prospect ownership check as generateWebsiteMockup(),
// resolving the caller's own org name and is_internal so the kit is
// written on their agency's behalf, not defaulted to Hamish's identity
// and hamishai.org proof points.
//
// The error return's `reason` field (Command Centre "recommend -> act"
// spec, 2026-08-31) is additive — sourced directly from checkUsage()'s
// own already-discriminated result, nothing new computed. SalesKitSection
// (prospecting-panel.tsx), the existing caller, only ever reads `.error`
// and is unaffected; the new Command Centre call site is the only reader
// of `.reason`.
export async function generateSalesKit(prospectId: string): Promise<
  { kit: SalesKit; generatedAt: string } | { error: string; reason?: "usage_limit" | "rate_limited" }
> {
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
    return { error: usageCheckErrorMessage(usageCheck), reason: usageCheck.rateLimited ? "rate_limited" : "usage_limit" };
  }

  const { data: org } = await admin.from("organisations").select("name, is_internal, prospecting_config").eq("id", orgId).single();
  const sender =
    org && !org.is_internal
      ? {
          name: org.name,
          isInternal: false,
          agencyType: findAgencyType((org.prospecting_config as { agencyType?: string } | null)?.agencyType),
        }
      : { name: "Hamish AI", isInternal: true };

  const startedAt = Date.now();
  const result = await draftSalesKit(prospectId, sender);
  logAiCall(orgId, "sales_kit", { success: "kit" in result, latencyMs: Date.now() - startedAt });
  if (!usageCheck.isInternal && "kit" in result) await recordUsageEvent(orgId, "sales_kit_generated");
  revalidatePath("/studio/prospects");
  return result;
}

// Studio big-ticket ("proposal send-and-track workflow") — roadmap item
// #6 (proposal-pdf.tsx) stopped at "download a PDF"; this is the actual
// send, plus a way to know what happened after. No new AI call and no
// new proposal content — same sales_kit.proposal_outline the PDF route
// already renders, just emailed with a public tracking link (and the
// same PDF attached) instead of only ever downloaded by the tenant
// themselves.
export async function sendProposal(prospectId: string): Promise<{ ok: true } | { error: string }> {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: prospect } = await admin
    .from("prospects")
    .select("business_name, email, sales_kit, status, contacted_at")
    .eq("id", prospectId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!prospect) return { error: "Prospect not found." };
  if (!prospect.email) return { error: "This prospect has no contact email on file." };

  const salesKit = prospect.sales_kit as SalesKit | null;
  if (!salesKit?.proposal_outline) return { error: "Generate this prospect's sales kit first — there's no proposal content yet." };

  const { data: org } = await admin.from("organisations").select("name, is_internal, brand").eq("id", orgId).single();
  if (!org) return { error: "Organisation not found." };
  const brand = (org.brand ?? {}) as { accentColor?: string; rateCard?: RateCardItem[]; replyToEmail?: string };
  const orgName = org.is_internal ? "Hamish AI" : org.name;

  // Same fail-closed gate every other tenant-facing send in this app
  // uses (send-org-email.ts's own header) — a tenant with no reply-to
  // configured yet just can't send under their own identity, rather
  // than guessing one.
  if (!org.is_internal && !brand.replyToEmail) {
    return { error: "Add a reply-to email in Settings before sending proposals to prospects." };
  }

  const token = await createProposalToken(admin, { orgId, prospectId, sentTo: prospect.email });
  if (!token) return { error: "Failed to create a tracking link for this proposal." };

  const proposalUrl = `https://hamishai.org/proposal/${token}`;
  const pdf = await renderProposalPdf({
    orgName,
    accentColor: brand.accentColor ?? null,
    prospectBusinessName: prospect.business_name,
    proposalOutline: salesKit.proposal_outline,
    rateCard: brand.rateCard ?? [],
    contactEmail: brand.replyToEmail ?? null,
  });
  const attachments = [
    { filename: `${prospect.business_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-proposal.pdf`, content: pdf },
  ];

  const subject = `A proposal from ${orgName}`;
  const text = `Hi,\n\n${salesKit.proposal_outline.overview}\n\nYou can view and accept the full proposal here:\n${proposalUrl}\n\nA PDF copy is attached too.\n\n— ${orgName}`;

  if (org.is_internal) {
    await sendClientEmail(prospect.email, subject, text, attachments);
  } else {
    const sendResult = await sendOrgEmail({
      orgId,
      orgName: org.name,
      replyToEmail: brand.replyToEmail!,
      to: prospect.email,
      subject,
      text,
      attachments,
    });
    if ("error" in sendResult) return sendResult;
  }

  // Studio big-ticket ("sendProposal doesn't feed the follow-up
  // cadence") — lead-status.ts's own cadence (getLeadCadenceAction, used
  // by autonomous-outreach.ts and the prospecting UI) is gated on
  // status === "contacted" with a real contacted_at set; sending a
  // proposal is real contact and was never recording either, so a
  // prospect who never replies to an unanswered proposal could sit
  // forever with no follow-up ever prompted. Only set when this is the
  // *first* real contact (contacted_at still null) — a proposal sent
  // after an initial contact already happened shouldn't reset an
  // already-running cadence clock, same "don't clobber a more advanced
  // state" reasoning markProspectContacted()'s own callers rely on.
  if (!prospect.contacted_at && prospect.status !== "converted" && prospect.status !== "lost") {
    await admin
      .from("prospects")
      .update({ status: "contacted", contacted_at: new Date().toISOString(), last_contact_method: "email" })
      .eq("id", prospectId);
  }

  logAuditEvent({
    actor: orgName,
    actorType: "admin",
    action: "prospect.proposal_sent",
    targetType: "prospect",
    targetId: prospectId,
    orgId,
  });

  revalidatePath("/studio/prospects");
  return { ok: true };
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

  // Studio big-ticket ("client onboarding/kickoff workflow") — converting
  // a prospect used to do nothing but insert these two rows: no welcome
  // email (despite send-org-email.ts existing since item #1), no kickoff
  // prompt (despite booking-link.ts existing since item #9), no initial
  // project to start from. A brand-new client got silent portal access
  // and nothing else. Both additions below are deliberately just glue
  // across already-shipped primitives, not new infrastructure — an
  // intake questionnaire (a real new data model/review flow) is a
  // separate, bigger feature this doesn't attempt.
  //
  // Same "one real Onboarding project per new client, not one per
  // request" shape as everywhere else projects get created in this
  // app — a real row in the exact same table/shape createProject()
  // (projects/actions.ts) inserts, so it shows up identically in
  // Projects. 14 days out is a starting-point target, not a promise —
  // same "a reminder, not a commitment" framing calendar-sync.ts's own
  // DUE_OFFSET_DAYS uses for task due dates.
  const kickoffTargetDate = new Date();
  kickoffTargetDate.setDate(kickoffTargetDate.getDate() + 14);
  const { error: projectError } = await admin.from("projects").insert({
    org_id: orgId,
    client_id: client.id,
    name: "Onboarding",
    target_date: kickoffTargetDate.toISOString().slice(0, 10),
  });
  if (projectError) console.error("Failed to seed the onboarding project on client creation:", projectError);

  const { data: org } = await admin.from("organisations").select("name, is_internal, brand").eq("id", orgId).single();
  const brand = (org?.brand ?? {}) as { replyToEmail?: string; bookingLink?: string };
  if (org && !org.is_internal && brand.replyToEmail) {
    const bookingLine = brand.bookingLink ? `\n\nLet's get started — book a quick kickoff call here:\n${brand.bookingLink}` : "";
    await sendOrgEmail({
      orgId,
      orgName: org.name,
      replyToEmail: brand.replyToEmail,
      to: normalisedEmail,
      subject: `Welcome to ${org.name}`,
      text: `Hi,\n\nWelcome — ${prospect.business_name} now has its own client portal at hamishai.org/portal, where you can see project updates, submit requests, and check invoices any time.${bookingLine}\n\nLooking forward to working with you.\n\n— ${org.name}`,
    });
  }

  await trackServerEvent(orgId, "prospect_converted", { client_id: client.id });

  revalidatePath("/studio/prospects");
  revalidatePath("/studio/clients");
  revalidatePath("/studio/projects");
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
// Studio big-ticket ("team collaboration") — same shape as requests/
// actions.ts's own requireOrgIdAndEmail()/assignRequest(), extended to
// prospects: who's actually chasing this lead. A separate local helper
// rather than changing requireOrgId()'s own return shape, same
// "duplicated per file on purpose" convention every requireOrgId() copy
// in this app already documents.
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

export async function assignProspect(prospectId: string, assigneeEmail: string | null) {
  const { orgId, email: actorEmail } = await requireOrgIdAndEmail();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: prospect } = await admin.from("prospects").select("id, business_name").eq("id", prospectId).eq("org_id", orgId).maybeSingle();
  if (!prospect) return { error: "Prospect not found." };

  const normalised = assigneeEmail?.trim().toLowerCase() || null;
  if (normalised) {
    const { data: member } = await admin.from("memberships").select("email").eq("org_id", orgId).eq("email", normalised).maybeSingle();
    if (!member) return { error: "That person isn't on your team." };
  }

  const { error } = await admin.from("prospects").update({ assigned_to: normalised }).eq("id", prospectId);
  if (error) return { error: "Failed to update." };

  logAuditEvent({
    actor: actorEmail,
    actorType: "admin",
    action: normalised ? "prospect.assigned" : "prospect.unassigned",
    targetType: "prospect",
    targetId: prospectId,
    orgId,
    metadata: normalised ? { assignedTo: normalised } : undefined,
  });

  // Big-ticket #4 ("invites and assignments are silent") — same
  // fire-and-forget shape as assignRequest()'s own notification.
  if (normalised) {
    notifyAssignee(admin, {
      orgId,
      assigneeEmail: normalised,
      assignedByEmail: actorEmail,
      itemLabel: `the prospect ${prospect.business_name}`,
      path: "/studio/prospects",
    });
  }

  revalidatePath("/studio/prospects");
  return { ok: true as const };
}

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
