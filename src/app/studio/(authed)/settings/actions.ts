"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkForReplies } from "@/lib/detect-replies";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { logAuditEvent } from "@/lib/audit-log";
import { sanitizeBlocksForWrite, type Block, type CommandCentreLayout } from "@/lib/command-centre-layout";

// Same session-derivation as prospects/actions.ts's requireOrgId() — kept
// as its own local copy, same convention billing/actions.ts documents.
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

export async function disconnectInbox() {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { error } = await admin
    .from("email_connections")
    .delete()
    .eq("org_id", orgId)
    .eq("provider", "microsoft");
  if (error) return { error: "Failed to disconnect." };

  revalidatePath("/studio/settings");
  return { ok: true as const };
}

export async function runReplyCheck() {
  const orgId = await requireOrgId();
  const result = await checkForReplies(orgId);
  revalidatePath("/studio/settings");
  revalidatePath("/studio/prospects");
  return result;
}

// Writes into the same organisations.brand jsonb column
// getPortalOrgBranding() (portal-org-branding.ts) already reads —
// existing, working infrastructure that just never had a Studio-side
// editor. Merged rather than overwritten, same reasoning as
// updateProspectingConfig() in prospects/actions.ts: brand is expected to
// grow more keys later (logo, eventually a custom domain per that
// column's own schema comment) and a colour update shouldn't erase them.
export async function updateBrandAccent(color: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  if (!/^#[0-9a-f]{6}$/i.test(color)) return { error: "Enter a valid colour." };

  const { data: org } = await admin.from("organisations").select("brand").eq("id", orgId).single();
  const merged = { ...(org?.brand ?? {}), accentColor: color };

  const { error } = await admin.from("organisations").update({ brand: merged }).eq("id", orgId);
  if (error) return { error: "Failed to save your portal colour." };

  revalidatePath("/studio/settings");
  return { ok: true as const };
}

// Command Centre Phase 5b/5c (§22-23 rescoped, see
// schema-command-centre-layout-v2.sql's own comment) — a no-code control
// over which blocks show on the Command Centre, their order, width, and
// (for chart/text/cta blocks, Phase 5c) their own content, saved per-org.
// `blocks` is the client's proposed layout in full: a singleton block
// (stat/section) missing from the list is "hidden"; a chart/text/cta
// block missing from the list simply no longer exists. Re-validated
// through sanitizeBlocksForWrite() rather than trusted structurally — a
// Server Action argument is just parsed JSON over the wire, the caller's
// TypeScript type is never checked at runtime.
export async function updateCommandCentreLayout(blocks: Block[]) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const clean = sanitizeBlocksForWrite(blocks);
  if (!clean) return { error: "Invalid layout." };

  const layout: CommandCentreLayout = { version: 2, blocks: clean };
  const { error } = await admin.from("organisations").update({ command_centre_layout: layout }).eq("id", orgId);
  if (error) return { error: "Failed to save your layout." };

  revalidatePath("/studio/settings");
  revalidatePath("/studio");
  return { ok: true as const };
}

export async function resetCommandCentreLayout() {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { error } = await admin.from("organisations").update({ command_centre_layout: null }).eq("id", orgId);
  if (error) return { error: "Failed to reset your layout." };

  revalidatePath("/studio/settings");
  revalidatePath("/studio");
  return { ok: true as const };
}

export async function resetBrandAccent() {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: org } = await admin.from("organisations").select("brand").eq("id", orgId).single();
  const merged = { ...(org?.brand ?? {}) } as Record<string, unknown>;
  delete merged.accentColor;

  const { error } = await admin.from("organisations").update({ brand: merged }).eq("id", orgId);
  if (error) return { error: "Failed to reset your portal colour." };

  revalidatePath("/studio/settings");
  return { ok: true as const };
}

// GDPR minimum-viable compliance, part 3 — see schema-account-deletion-
// request.sql's own comment for why this is a request, not an instant
// hard delete: destroying an entire org (prospects, clients, invoices, a
// live Stripe Connect account) in one unconfirmed click is a different
// order of risk from deleteClientData()'s per-client erasure, and
// deserves a human checkpoint before this codebase automates it. Records
// the request, alerts the operator immediately (sendErrorAlert is
// generic enough for "something urgent needs a human," despite the
// name), and the UI refuses to submit a second request once one is
// already pending.
export async function requestAccountDeletion() {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: org } = await admin.from("organisations").select("name, deletion_requested_at").eq("id", orgId).single();
  if (org?.deletion_requested_at) return { error: "A deletion request is already pending for your account." };

  const requestedAt = new Date().toISOString();
  const { error } = await admin.from("organisations").update({ deletion_requested_at: requestedAt }).eq("id", orgId);
  if (error) return { error: "Failed to record your request — try again or contact us directly." };

  await logAuditEvent({
    actor: orgId,
    actorType: "admin",
    action: "organisation.deletion_requested",
    targetType: "organisation",
    targetId: orgId,
  });
  await sendErrorAlert(
    "Account deletion requested",
    `${org?.name ?? "An organisation"} (${orgId}) has requested full account deletion via Studio Settings. This needs a human to actually carry out — not automated.`
  );

  revalidatePath("/studio/settings");
  return { ok: true as const, requestedAt };
}
