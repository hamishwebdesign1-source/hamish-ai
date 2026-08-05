import type { SupabaseClient } from "@supabase/supabase-js";

// Resolves a signed-in portal session to the client (business) it belongs
// to via client_members (schema-client-members.sql) rather than a direct
// clients.email match — the change that makes more than one person per
// client able to sign in. Works with either the session-scoped client
// (RLS-protected — a user can only ever see their own membership row) or
// the service-role client, since this is just a select.
//
// .limit(1) rather than .single(): this product doesn't support one email
// belonging to more than one client's portal today, but a stray duplicate
// invite shouldn't 500 the whole portal — it should just resolve to
// *a* membership, deterministically (oldest invite first) rather than
// throwing.
export type PortalMembership = {
  clientId: string;
  role: "owner" | "member";
  acceptedAt: string | null;
};

export async function getPortalMembership(supabase: SupabaseClient, email: string): Promise<PortalMembership | null> {
  const { data } = await supabase
    .from("client_members")
    .select("client_id, role, accepted_at")
    .eq("email", email)
    .order("invited_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { clientId: data.client_id, role: data.role as "owner" | "member", acceptedAt: data.accepted_at };
}

// Marks a membership as accepted on first successful sign-in — purely
// informational (shown next to a member's name in the admin team list).
// Deliberately takes the service-role client: client_members is
// SELECT-only for session clients (same as every other portal-facing
// table under RLS), and this one-line side effect isn't worth adding a
// write policy for.
export async function markMembershipAccepted(admin: SupabaseClient, clientId: string, email: string) {
  const { error } = await admin
    .from("client_members")
    .update({ accepted_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("email", email)
    .is("accepted_at", null);

  if (error) console.error("Failed to mark portal membership accepted:", error);
}
