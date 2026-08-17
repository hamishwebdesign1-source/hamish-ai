import type { SupabaseClient } from "@supabase/supabase-js";

// Resolves a signed-in session to the organisation it belongs to via
// memberships (schema-organisations.sql) — the same one-more-join pattern
// as getPortalMembership()/client_members (portal-membership.ts), one level
// up: client_members answers "which client is this person part of,"
// memberships answers "which organisation (HamishAI itself, or a paying
// Agency Platform tenant) is this person part of." Works with either the
// session-scoped client (RLS-protected — a user can only ever see their
// own membership row) or the service-role client, since this is just a
// select.
//
// .limit(1) rather than .single(): same reasoning as getPortalMembership()
// — a stray duplicate invite shouldn't 500 the whole workspace, it should
// resolve to *a* membership, deterministically (oldest invite first)
// rather than throwing. This product doesn't support one email belonging
// to more than one organisation today.
//
// HAMISHAI_ORG_ID is the literal id inserted by
// schema-backfill-internal-org.sql — exported so /studio (once it exists)
// and any org-scoped query can recognise "this is the internal
// organisation" without a round trip, the same way is_internal is checked
// server-side.
export const HAMISHAI_ORG_ID = "00000000-0000-0000-0000-000000000001";

export type OrgMembership = {
  orgId: string;
  role: "owner" | "member";
  acceptedAt: string | null;
};

export async function getOrgMembership(supabase: SupabaseClient, email: string): Promise<OrgMembership | null> {
  const { data } = await supabase
    .from("memberships")
    .select("org_id, role, accepted_at")
    .eq("email", email)
    .order("invited_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { orgId: data.org_id, role: data.role as "owner" | "member", acceptedAt: data.accepted_at };
}

// Marks a membership as accepted on first successful sign-in — purely
// informational (shown next to a member's name once /studio/settings has a
// team list, same as the existing admin team list for client_members).
// Deliberately takes the service-role client: memberships is SELECT-only
// for session clients (same as client_members), and this one-line side
// effect isn't worth adding a write policy for.
export async function markOrgMembershipAccepted(admin: SupabaseClient, orgId: string, email: string) {
  const { error } = await admin
    .from("memberships")
    .update({ accepted_at: new Date().toISOString() })
    .eq("org_id", orgId)
    .eq("email", email)
    .is("accepted_at", null);

  if (error) console.error("Failed to mark org membership accepted:", error);
}
