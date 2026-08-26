import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendClientEmail } from "@/lib/send-client-email";
import { getStudioBriefing } from "@/lib/studio-briefing";
import { computeClientEngagementRisk } from "@/lib/studio-engagement";

// Owner-facing digest — Command Centre improvement #2 from this session's
// studio review. Every real "you should look at this" signal on /studio
// (Actions Required, Engagement Risk) has always been pull-only: a
// tenant only finds out a client's gone quiet, or a follow-up is
// overdue, if they happen to open the dashboard. This pushes the same
// real numbers to them instead, weekly, same cadence as the client-
// facing digest (weekly-digest.ts).
//
// Deliberately NOT gated to is_internal the way weekly-digest.ts is.
// That gate exists because sendClientEmail()'s hardcoded "Hamish AI
// <hello@hamishai.org>" from-address would misrepresent who's actually
// writing when a TENANT's own briefing goes out to that tenant's OWN
// clients (see studio-briefing.ts's original comment on exactly this —
// the reason it stayed in-app-only for so long). Here the direction is
// the other way round: HamishAI, genuinely, emailing a tenant directly
// about their own Studio workspace. The from-address is correct for
// every org this runs for, HamishAI's own included.
//
// Same "only send when there's something real" rule as weekly-digest.ts
// — an org with nothing outstanding is skipped entirely, no empty
// "all quiet" email.
export async function sendOwnerDigests() {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." as const };

  const { data: orgs, error: orgsError } = await admin
    .from("organisations")
    .select("id, name")
    .eq("owner_digest_enabled", true);

  if (orgsError) return { error: "Failed to fetch organisations." as const };

  const sent: string[] = [];

  for (const org of orgs ?? []) {
    const summary = await buildOwnerDigestSummary(admin, org.id);
    if (!summary) continue;

    // memberships, not clients — the recipient here is the agency owner
    // running this org, not one of their clients (org-membership.ts).
    // accepted_at filter: only a real, signed-in owner, never a pending
    // invite that's never actually been claimed.
    const { data: owners } = await admin
      .from("memberships")
      .select("email")
      .eq("org_id", org.id)
      .eq("role", "owner")
      .not("accepted_at", "is", null);

    for (const owner of owners ?? []) {
      if (!owner.email) continue;
      await sendClientEmail(owner.email, `Your Command Centre digest — ${org.name}`, summary);
      sent.push(`${org.name} <${owner.email}>`);
    }
  }

  return { sent };
}

// Reuses the exact same computations the dashboard itself renders with
// (getStudioBriefing, computeClientEngagementRisk) — an emailed number
// can never drift from what /studio shows if a tenant clicks through.
// Scoped to Actions Required + Engagement Risk only, not the full
// Insights feed: those two are the "something needs doing" categories
// this digest exists to push; Insights stays a pull-only, in-app
// feature for now rather than risk a noisier email than the real
// urgency warrants.
async function buildOwnerDigestSummary(admin: SupabaseClient, orgId: string): Promise<string | null> {
  const briefing = await getStudioBriefing(admin, orgId);

  const { data: clients } = await admin.from("clients").select("id, business_name").eq("org_id", orgId);
  const clientIds = (clients ?? []).map((c) => c.id);

  const [{ data: requests }, { data: invoices }, { data: projects }] = clientIds.length
    ? await Promise.all([
        admin.from("requests").select("id, client_id, status, responded_at, created_at").in("client_id", clientIds),
        admin.from("invoices").select("client_id, status, due_date").in("client_id", clientIds),
        admin.from("projects").select("status, target_date").in("client_id", clientIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const today = new Date().toISOString().slice(0, 10);
  const openRequestCount = (requests ?? []).filter((r) => !r.responded_at).length;
  const overdueProjectCount = (projects ?? []).filter((p) => p.status === "active" && p.target_date && p.target_date < today).length;

  const engagementRisks = computeClientEngagementRisk(clients ?? [], requests ?? [], invoices ?? [], new Date());

  const actionLines: string[] = [];
  if (briefing.followUpsDue > 0) {
    actionLines.push(`- ${briefing.followUpsDue} prospect follow-up${briefing.followUpsDue === 1 ? "" : "s"} due`);
  }
  if (overdueProjectCount > 0) {
    actionLines.push(`- ${overdueProjectCount} overdue project${overdueProjectCount === 1 ? "" : "s"}`);
  }
  if (openRequestCount > 0) {
    actionLines.push(`- ${openRequestCount} client request${openRequestCount === 1 ? "" : "s"} awaiting your reply`);
  }

  const riskLines = engagementRisks
    .slice(0, 5)
    .map((r) => {
      const bits = [r.tier === "critical" ? "critical" : "worth a check-in"];
      if (r.quietWeeks > 0) bits.push(`quiet ${r.quietWeeks}w`);
      if (r.hasOverdueInvoice) bits.push("invoice overdue");
      return `- ${r.businessName}: ${bits.join(", ")}`;
    });

  if (actionLines.length === 0 && riskLines.length === 0) return null;

  const sections: string[] = [];
  if (actionLines.length > 0) sections.push(`Needs your attention:\n${actionLines.join("\n")}`);
  if (riskLines.length > 0) sections.push(`Engagement risk:\n${riskLines.join("\n")}`);

  return `Hi,\n\nHere's where things stand in your Command Centre:\n\n${sections.join(
    "\n\n"
  )}\n\nFull picture any time at hamishai.org/studio.\n\nTurn this email off any time in Studio → Settings → Notifications.\n\n— Hamish AI`;
}
