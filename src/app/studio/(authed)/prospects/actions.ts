"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { discoverLeads } from "@/lib/discover-leads";

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
  const result = await discoverLeads(orgId);
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

  revalidatePath("/studio/prospects");
  revalidatePath("/studio/clients");
  return { ok: true as const, clientId: client.id };
}
