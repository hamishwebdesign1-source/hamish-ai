"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkForReplies } from "@/lib/detect-replies";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { logAuditEvent } from "@/lib/audit-log";
import { isValidCardId } from "@/lib/command-centre-layout";

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

// Command Centre Phase 5, first real slice (§22-23 rescoped, see
// schema-command-centre-layout.sql's own comment) — a no-code control
// over which of the 5 real stat cards show on the Command Centre and in
// what order, saved per-org. `cards` is the full list the client wants
// to persist: an id present but toggled off simply isn't included (the
// Command Centre page treats "not in the array" as "hidden"), so this
// one array carries both visibility and order. Rejects anything that
// isn't a known card id rather than trusting client input.
export async function updateCommandCentreCards(cards: string[]) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const deduped = Array.from(new Set(cards));
  if (deduped.length === 0 || !deduped.every(isValidCardId)) {
    return { error: "Invalid card selection." };
  }

  const { error } = await admin.from("organisations").update({ command_centre_cards: deduped }).eq("id", orgId);
  if (error) return { error: "Failed to save your layout." };

  revalidatePath("/studio/settings");
  revalidatePath("/studio");
  return { ok: true as const };
}

export async function resetCommandCentreCards() {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { error } = await admin.from("organisations").update({ command_centre_cards: null }).eq("id", orgId);
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
