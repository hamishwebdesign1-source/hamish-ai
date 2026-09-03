import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";

// Roadmap item #4 — see schema-digest-action-tokens.sql for the full
// design reasoning. This is the one place both directions of a token's
// life happen: owner-digest.ts creates one per actionable bullet line,
// /studio-action/[token] consumes one when a human clicks Confirm.

export type DigestAction = "mark_prospect_contacted" | "mark_request_responded" | "mark_project_done";

const TOKEN_TTL_DAYS = 10; // digest is weekly; this comfortably outlives one send-to-send gap

export async function createDigestActionToken(
  admin: SupabaseClient,
  params: { orgId: string; action: DigestAction; targetId: string; label: string }
): Promise<string | null> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from("digest_action_tokens").insert({
    token,
    org_id: params.orgId,
    action: params.action,
    target_id: params.targetId,
    label: params.label,
    expires_at: expiresAt,
  });
  if (error) {
    console.error("Failed to create digest action token:", error);
    return null;
  }
  return token;
}

export type DigestActionTokenView = {
  label: string;
  action: DigestAction;
  used: boolean;
  expired: boolean;
};

// GET-side lookup only — never writes. Used by /studio-action/[token]'s
// page render to decide what to show (a live confirm form, "already
// done", or "link expired") without performing anything itself.
export async function readDigestActionToken(token: string): Promise<DigestActionTokenView | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data } = await admin
    .from("digest_action_tokens")
    .select("action, label, used_at, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;

  return {
    label: data.label,
    action: data.action as DigestAction,
    used: Boolean(data.used_at),
    expired: new Date(data.expires_at) < new Date(),
  };
}

// The actual per-action writes. Deliberately NOT calling the existing
// session-based Server Actions (prospects/actions.ts's
// markProspectContacted, etc.) — those all derive their org boundary
// from requireOrgId() (a signed-in session), which a bare emailed link
// will never have. The org_id here comes from the token row instead,
// itself captured at creation time from an already-org-scoped query
// inside owner-digest.ts — the token is the authorization, not a
// session. Same underlying writes as their session-based counterparts,
// just a different, deliberately narrower auth boundary reaching them.
async function performDigestAction(admin: SupabaseClient, action: DigestAction, orgId: string, targetId: string): Promise<{ error?: string }> {
  const now = new Date().toISOString();

  if (action === "mark_prospect_contacted") {
    const { error } = await admin
      .from("prospects")
      .update({ status: "contacted", contacted_at: now, last_contact_method: "email" })
      .eq("id", targetId)
      .eq("org_id", orgId);
    return error ? { error: "Failed to update the prospect." } : {};
  }

  if (action === "mark_request_responded") {
    // No org_id column on requests directly (same shape requestBelongsToOrg
    // in requests/actions.ts works around) — safe here without re-deriving
    // it via a join, because the token's own org_id was already captured
    // from a query scoped to this org's clients at creation time
    // (owner-digest.ts only ever builds a token for a request it just
    // fetched via that org's own client id list).
    const { error } = await admin.from("requests").update({ responded_at: now }).eq("id", targetId);
    return error ? { error: "Failed to update the request." } : {};
  }

  // mark_project_done — Projects Kanban Command Centre, Phase A: `stage`
  // is now the real source of truth ('completed' -> status 'done', see
  // project-stages.ts's deriveProjectStatus()); this one-click digest
  // action writes both together rather than leaving `stage` stale while
  // `status` says done, which would show the project stuck in its old
  // Kanban column forever despite reading as finished everywhere else.
  const { error } = await admin.from("projects").update({ status: "done", stage: "completed" }).eq("id", targetId).eq("org_id", orgId);
  return error ? { error: "Failed to update the project." } : {};
}

export type ConsumeResult = { ok: true; label: string } | { error: string };

// POST-side only — validates, performs the write, marks the token used,
// all in this one call. A token can only ever reach this successfully
// once: used_at is checked before the write and set right after, so a
// double-submit (a slow network retry, a second tab) fails closed on the
// second attempt rather than repeating the write.
export async function consumeDigestActionToken(token: string): Promise<ConsumeResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: row } = await admin
    .from("digest_action_tokens")
    .select("org_id, action, target_id, label, used_at, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!row) return { error: "This link isn't valid." };
  if (row.used_at) return { error: "This link has already been used." };
  if (new Date(row.expires_at) < new Date()) return { error: "This link has expired." };

  const result = await performDigestAction(admin, row.action as DigestAction, row.org_id, row.target_id);
  if (result.error) return { error: result.error };

  const { error: markUsedError } = await admin
    .from("digest_action_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token)
    .is("used_at", null);
  if (markUsedError) console.error(`Failed to mark digest action token used (token ${token}):`, markUsedError);

  return { ok: true, label: row.label };
}
