import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlatformPlan, type PlatformPlanSlug } from "@/lib/platform-plans";
import { sendClientEmail } from "@/lib/send-client-email";

// Closes a real, live gap: platform-plans.ts's Agency tier literally
// advertises "Multiple team seats" in its own feature list, and the
// schema has supported it since Week 1 (organisations.sql's own
// `memberships` table, role owner/member, invited_at/accepted_at) — but
// nothing ever let an owner actually invite anyone. org-membership.ts's
// markOrgMembershipAccepted() was written for exactly this and has sat
// uncalled ever since.
//
// A plan's own copy only ever says "1 seat" or "multiple" — never a hard
// number for the latter. AGENCY_SEAT_CAP is our own unadvertised ceiling
// purely to stop unbounded invite spam, not a marketed limit — same
// "fair-use ceiling, not a hard marketed limit" framing usage-warnings.ts
// already uses for AI action caps.
const AGENCY_SEAT_CAP = 10;

export function seatLimitForPlan(plan: PlatformPlanSlug): number {
  const seats = getPlatformPlan(plan).seats;
  return seats === "multiple" ? AGENCY_SEAT_CAP : seats;
}

export type TeamMember = { email: string; role: "owner" | "member"; invitedAt: string; acceptedAt: string | null };

export async function listTeamMembers(admin: SupabaseClient, orgId: string): Promise<TeamMember[]> {
  const { data } = await admin
    .from("memberships")
    .select("email, role, invited_at, accepted_at")
    .eq("org_id", orgId)
    .order("invited_at", { ascending: true });

  return (data ?? []).map((m) => ({
    email: m.email,
    role: m.role as "owner" | "member",
    invitedAt: m.invited_at,
    acceptedAt: m.accepted_at,
  }));
}

export type InviteResult = { ok: true } | { error: string };

export async function inviteTeamMember(
  admin: SupabaseClient,
  params: { orgId: string; plan: PlatformPlanSlug; inviterEmail: string; inviteeEmail: string }
): Promise<InviteResult> {
  const email = params.inviteeEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };

  // This product doesn't support one email belonging to more than one
  // organisation — org-membership.ts's getOrgMembership() picks the
  // *oldest* membership by invited_at when resolving a session, so a
  // second row for an email that already belongs elsewhere would just
  // silently lose the next time that person signs in, not create real
  // access here. Checked globally, not scoped to this org, on purpose.
  const { data: existing } = await admin.from("memberships").select("org_id").eq("email", email).limit(1).maybeSingle();
  if (existing) {
    return {
      error: existing.org_id === params.orgId ? "This person is already on your team." : "This email already belongs to a different workspace.",
    };
  }

  const members = await listTeamMembers(admin, params.orgId);
  const limit = seatLimitForPlan(params.plan);
  if (members.length >= limit) {
    return {
      error:
        params.plan === "agency"
          ? `You've reached this workspace's team limit (${limit} seats).`
          : "Your plan includes 1 seat. Upgrade to the Agency plan to add team members.",
    };
  }

  // accepted_at stays null (the column default) until this person
  // actually signs in — /api/platform/callback resolves any known
  // membership straight to /studio (skipping onboarding, which would
  // otherwise try to create them a *second* organisation) and marks it
  // accepted there, the same acceptance step createAgencyOrganisation()
  // already sets immediately for a self-signup owner.
  const { error } = await admin.from("memberships").insert({
    org_id: params.orgId,
    email,
    role: "member",
    invited_by: params.inviterEmail,
  });
  if (error) return { error: "Failed to invite that person." };

  return { ok: true };
}

export type RemoveResult = { ok: true } | { error: string };

export async function removeTeamMember(admin: SupabaseClient, orgId: string, email: string): Promise<RemoveResult> {
  const { data: row } = await admin.from("memberships").select("role").eq("org_id", orgId).eq("email", email).maybeSingle();
  if (!row) return { error: "That person isn't on your team." };
  if (row.role === "owner") return { error: "The workspace owner can't be removed." };

  const { error } = await admin.from("memberships").delete().eq("org_id", orgId).eq("email", email);
  if (error) return { error: "Failed to remove that person." };

  return { ok: true };
}

// Big-ticket #4 ("invites and assignments are silent") — assignRequest()/
// assignProspect()/assignProject() (requests/prospects/projects
// actions.ts) all write assigned_to and log an audit event, but none of
// them told the assignee anything ever reached them except opening
// Studio and happening to notice. One shared fire-and-forget helper
// rather than three copies of the same lookup+send.
//
// sendClientEmail(), not sendOrgEmail() — same reasoning inviteTeamMemberAction()
// (settings/actions.ts) and owner-digest.ts's own comment both already
// document: this is HamishAI genuinely emailing a person about their own
// Studio workspace, not the tenant's own outbound identity, so
// sendOrgEmail()'s tenant-facing "from" would misrepresent who's
// actually sending it.
export async function notifyAssignee(
  admin: SupabaseClient,
  params: {
    orgId: string;
    assigneeEmail: string;
    assignedByEmail: string;
    itemLabel: string;
    path: "/studio/requests" | "/studio/prospects" | "/studio/projects" | "/studio/website-builder";
  }
): Promise<void> {
  // No point emailing someone about assigning something to themselves.
  if (params.assigneeEmail === params.assignedByEmail) return;

  const { data: org } = await admin.from("organisations").select("name").eq("id", params.orgId).maybeSingle();
  const orgName = org?.name ?? "your workspace";

  await sendClientEmail(
    params.assigneeEmail,
    `${params.assignedByEmail} assigned you something in ${orgName}`,
    `Hi,\n\n${params.assignedByEmail} assigned you ${params.itemLabel} in ${orgName} on Hamish AI's Agency Platform.\n\nView it here:\nhttps://hamishai.org${params.path}\n\n— Hamish AI`
  );
}
