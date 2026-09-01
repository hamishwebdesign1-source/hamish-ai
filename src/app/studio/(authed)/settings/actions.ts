"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkForReplies } from "@/lib/detect-replies";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { logAuditEvent } from "@/lib/audit-log";
import { sanitizeBlocksForWrite, type Block, type CommandCentreLayout } from "@/lib/command-centre-layout";
import { sanitizeTodayStripForWrite } from "@/lib/today-strip-config";
import { proposeCommandCentreLayout } from "@/lib/command-centre-design-assistant";
import { getUsageStatus, recordUsageEvent } from "@/lib/usage-limits";
import { isStudioActionRateLimited } from "@/lib/chat-rate-limit";
import type { PlatformPlanSlug } from "@/lib/platform-plans";
import { inviteTeamMember, removeTeamMember } from "@/lib/team-members";

// Same session-derivation as prospects/actions.ts's requireOrgId() — kept
// as its own local copy, same convention billing/actions.ts documents.
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

// Same shape as requireOrgId() above, plus the two extra fields
// inviteTeamMemberAction/removeTeamMemberAction need: the caller's own
// email (who's doing the inviting) and role (only an owner may).
async function requireOrgMembership(): Promise<{ orgId: string; role: "owner" | "member"; email: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) throw new Error("Not signed in.");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) throw new Error("No organisation found for this session.");
  return { orgId: membership.orgId, role: membership.role, email: user.email };
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

// Command Centre improvement #2 — owner-digest.ts's own opt-out. Same
// organisations write path as updateBrandAccent() above, just a single
// boolean column (schema-owner-digest.sql) instead of a merged jsonb one.
export async function updateOwnerDigestPreference(enabled: boolean) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { error } = await admin.from("organisations").update({ owner_digest_enabled: enabled }).eq("id", orgId);
  if (error) return { error: "Failed to save your notification preference." };

  revalidatePath("/studio/settings");
  return { ok: true as const };
}

// Command Centre improvement #6 — the TODAY masthead's own, much
// smaller config (today-strip-config.ts), separate from the block
// canvas below. Same organisations-via-admin-client write path as
// updateOwnerDigestPreference() above.
export async function updateTodayStripStats(ids: unknown) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const clean = sanitizeTodayStripForWrite(ids);
  if (!clean) return { error: "Choose at least one stat." };

  const { error } = await admin.from("organisations").update({ today_strip_stats: clean }).eq("id", orgId);
  if (error) return { error: "Failed to save your Today strip." };

  revalidatePath("/studio/settings");
  revalidatePath("/studio");
  return { ok: true as const };
}

const LAYOUT_HISTORY_LIMIT = 10;

// Command Centre Phase 5e — undo/version history. Called right before
// any write that would overwrite a real (non-null) layout, so the row
// it inserts is exactly what a revert should restore: the state that
// existed immediately before the action named by `source`. Silently a
// no-op if there was nothing to snapshot (an org that's never
// customised its layout has nothing worth saving a version of) or if
// Supabase errors — history is a convenience, never something that
// should block the actual save/reset/revert it's guarding.
async function snapshotLayoutHistory(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  orgId: string,
  previousLayout: unknown,
  source: "save" | "reset" | "revert"
) {
  if (!previousLayout || typeof previousLayout !== "object") return;

  const { error } = await admin.from("command_centre_layout_history").insert({ org_id: orgId, layout: previousLayout, source });
  if (error) {
    console.error("Failed to snapshot layout history:", error);
    return;
  }

  // Prune to the last LAYOUT_HISTORY_LIMIT — this is an undo stack, not
  // a permanent audit log, so an org iterating a lot doesn't accumulate
  // rows forever.
  const { data: toKeep } = await admin
    .from("command_centre_layout_history")
    .select("id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(LAYOUT_HISTORY_LIMIT);
  const keepIds = new Set((toKeep ?? []).map((r) => r.id));
  const { data: all } = await admin.from("command_centre_layout_history").select("id").eq("org_id", orgId);
  const staleIds = (all ?? []).map((r) => r.id).filter((id) => !keepIds.has(id));
  if (staleIds.length > 0) {
    await admin.from("command_centre_layout_history").delete().in("id", staleIds);
  }
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

  const { data: existing } = await admin.from("organisations").select("command_centre_layout").eq("id", orgId).single();
  await snapshotLayoutHistory(admin, orgId, existing?.command_centre_layout, "save");

  const layout: CommandCentreLayout = { version: 2, blocks: clean };
  const { error } = await admin.from("organisations").update({ command_centre_layout: layout }).eq("id", orgId);
  if (error) return { error: "Failed to save your layout." };

  revalidatePath("/studio/settings");
  revalidatePath("/studio");
  return { ok: true as const };
}

// Same usage/rate-limit discipline as every other Studio AI Server
// Action (prospects/actions.ts's own checkUsage()/usageCheckErrorMessage())
// — kept as its own local copy, same convention requireOrgId() above
// already documents for this file. This is a real AI-cost surface
// (§23's AI Design Assistant), not exempt from the platform readiness
// audit's own rule that every one of these gets a monthly cap.
async function checkAiUsage(
  orgId: string
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

  const usage = await getUsageStatus(orgId, "layout_redesign_proposed", org.plan as PlatformPlanSlug);
  if (!usage.allowed) return { allowed: false, isInternal: false, rateLimited: false, used: usage.used, limit: usage.limit };
  return { allowed: true, isInternal: false };
}

function aiUsageErrorMessage(usageCheck: { rateLimited: true } | { rateLimited: false; used: number; limit: number }): string {
  if (usageCheck.rateLimited) return "You're doing that a lot right now — wait a few minutes and try again.";
  return `Monthly limit reached (${usageCheck.used} of ${usageCheck.limit}) — try again next month.`;
}

// Command Centre Phase 5d (§23) — the AI Design Assistant. Read-only:
// this never writes to the database. It returns a proposed layout for
// the settings panel to load into its own editable draft, exactly like
// a person had just clicked all those buttons themselves — the existing
// updateCommandCentreLayout() above, unchanged, is still the only thing
// that ever persists a layout, and only once the human clicks Save.
export async function requestLayoutRedesign(instruction: string, currentBlocks: Block[]) {
  const orgId = await requireOrgId();
  const usageCheck = await checkAiUsage(orgId);
  if (!usageCheck.allowed) return { error: aiUsageErrorMessage(usageCheck) };

  // The client's current draft (including any unsaved edits already
  // made this session) is what the assistant builds on top of — not a
  // trusted value, just prompt context, since sanitizeBlocksForWrite()
  // inside proposeCommandCentreLayout() re-validates its own output
  // regardless of what was fed in here.
  const safeCurrentBlocks = sanitizeBlocksForWrite(currentBlocks) ?? [];
  const result = await proposeCommandCentreLayout(orgId, safeCurrentBlocks, instruction);

  if (!usageCheck.isInternal && "outcome" in result && result.outcome === "proposal") {
    await recordUsageEvent(orgId, "layout_redesign_proposed");
  }
  return result;
}

export async function resetCommandCentreLayout() {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: existing } = await admin.from("organisations").select("command_centre_layout").eq("id", orgId).single();
  await snapshotLayoutHistory(admin, orgId, existing?.command_centre_layout, "reset");

  const { error } = await admin.from("organisations").update({ command_centre_layout: null }).eq("id", orgId);
  if (error) return { error: "Failed to reset your layout." };

  revalidatePath("/studio/settings");
  revalidatePath("/studio");
  return { ok: true as const };
}

// Command Centre Phase 5e — restores a previous layout from history.
// Re-validated through sanitizeBlocksForWrite() like every other write
// path here, even though it's this app's own previously-saved data —
// defense in depth costs nothing and this function has no other way to
// know the row hasn't been tampered with between save and restore.
// Snapshots the layout being replaced first, same as every other write,
// so a revert is itself undoable rather than a one-way door.
export async function revertCommandCentreLayout(historyId: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: historyRow, error: fetchError } = await admin
    .from("command_centre_layout_history")
    .select("layout")
    .eq("id", historyId)
    .eq("org_id", orgId)
    .single();
  if (fetchError || !historyRow) return { error: "That version could no longer be found." };

  const stored = historyRow.layout as { blocks?: unknown } | null;
  const clean = sanitizeBlocksForWrite(stored?.blocks);
  if (!clean) return { error: "That version is no longer valid." };

  const { data: existing } = await admin.from("organisations").select("command_centre_layout").eq("id", orgId).single();
  await snapshotLayoutHistory(admin, orgId, existing?.command_centre_layout, "revert");

  const layout: CommandCentreLayout = { version: 2, blocks: clean };
  const { error } = await admin.from("organisations").update({ command_centre_layout: layout }).eq("id", orgId);
  if (error) return { error: "Failed to restore that version." };

  revalidatePath("/studio/settings");
  revalidatePath("/studio");
  return { ok: true as const, blocks: clean };
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

// Roadmap item #1 — the reply-to email an org sets here is what
// send-org-email.ts uses to send client-facing emails (payment
// reminders today) under the org's own name instead of refusing to send
// at all. Same organisations.brand jsonb column and merge-not-overwrite
// shape as updateBrandAccent() above. Revalidates /studio too, not just
// /studio/settings — setting this is what turns on the "Send payment
// reminder" control on the Command Centre's Engagement Risk card.
export async function updateReplyToEmail(email: string) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return { error: "Enter a valid email address." };

  const { data: org } = await admin.from("organisations").select("brand").eq("id", orgId).single();
  const merged = { ...(org?.brand ?? {}), replyToEmail: trimmed };

  const { error } = await admin.from("organisations").update({ brand: merged }).eq("id", orgId);
  if (error) return { error: "Failed to save your reply-to email." };

  revalidatePath("/studio/settings");
  revalidatePath("/studio");
  return { ok: true as const };
}

export async function clearReplyToEmail() {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: org } = await admin.from("organisations").select("brand").eq("id", orgId).single();
  const merged = { ...(org?.brand ?? {}) } as Record<string, unknown>;
  delete merged.replyToEmail;
  // Autonomous outreach can't function without a reply-to (send-org-email.ts
  // requires one) — clearing the email out from under it rather than
  // leaving a stale "enabled" flag that silently does nothing next cron run.
  delete merged.autonomousOutreachEnabled;

  const { error } = await admin.from("organisations").update({ brand: merged }).eq("id", orgId);
  if (error) return { error: "Failed to clear your reply-to email." };

  revalidatePath("/studio/settings");
  revalidatePath("/studio");
  return { ok: true as const };
}

// Roadmap item #2 — the opt-in for autonomous-outreach.ts's daily cadence
// sweep. Refuses to enable without a reply-to already configured (the
// cron's own check would just silently skip the org otherwise, which is a
// worse failure mode than telling the person why right here).
export async function updateAutonomousOutreach(enabled: boolean) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: org } = await admin.from("organisations").select("brand").eq("id", orgId).single();
  const brand = (org?.brand ?? {}) as { replyToEmail?: string };
  if (enabled && !brand.replyToEmail) return { error: "Set a reply-to email above first." };

  const merged = { ...(org?.brand ?? {}), autonomousOutreachEnabled: enabled };
  const { error } = await admin.from("organisations").update({ brand: merged }).eq("id", orgId);
  if (error) return { error: "Failed to save." };

  revalidatePath("/studio/settings");
  return { ok: true as const };
}

// Team seats gap — see team-members.ts's own comment for the full
// context. Owner-only: requireOrgMembership() gives us the real role from
// this session's own membership row, not something the caller could ever
// spoof from a form field.
export async function inviteTeamMemberAction(email: string) {
  const { orgId, role, email: inviterEmail } = await requireOrgMembership();
  if (role !== "owner") return { error: "Only the workspace owner can invite team members." };
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: org } = await admin.from("organisations").select("plan").eq("id", orgId).single();
  const plan = (org?.plan ?? "starter") as PlatformPlanSlug;

  const result = await inviteTeamMember(admin, { orgId, plan, inviterEmail, inviteeEmail: email });
  if ("error" in result) return result;

  revalidatePath("/studio/settings");
  return { ok: true as const };
}

export async function removeTeamMemberAction(email: string) {
  const { orgId, role } = await requireOrgMembership();
  if (role !== "owner") return { error: "Only the workspace owner can remove team members." };
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const result = await removeTeamMember(admin, orgId, email);
  if ("error" in result) return result;

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
