import type { SupabaseClient } from "@supabase/supabase-js";
import { getLeadCadenceAction } from "@/lib/lead-status";

// The "AI daily briefing" from the Opportunity Discovery Engine plan,
// scoped down deliberately: an in-app summary computed from data that
// already exists. No AI call, no new cost — pure aggregation over
// prospects a discovery run or research pass already generated.
//
// followUpsDue now also reaches a tenant outside the app, via
// owner-digest.ts — that's a genuinely different email direction (HamishAI
// emailing a tenant directly) from the one this comment originally ruled
// out (a tenant's own briefing going out under HamishAI's hardcoded
// from-address to that tenant's OWN clients, which would misrepresent who
// sent it). This function itself is unchanged; owner-digest.ts just reads
// followUpsDue from it the same way the in-app briefing card does.

export type TopOpportunity = { id: string; businessName: string; pursueBecause: string; overallScore: number; hasSalesKit: boolean };

// Command Centre improvement #1 ("cleared queue, not a dashboard") — the
// real prospect behind each unit of followUpsDue, not just the count.
// nextAction mirrors getLeadCadenceAction()'s own two real outcomes, so
// the queue row can say what's actually due ("call" vs "one more
// follow-up") instead of a generic "follow-up due" for both.
export type FollowUpDue = { id: string; businessName: string; nextAction: "call" | "follow_up" };

export type StudioBriefing = {
  newThisWeek: number;
  needsResearch: number;
  readyToContact: number; // researched, has a sales kit, not yet converted
  followUpsDue: number; // contacted, no reply, past the cadence threshold (lead-status.ts)
  topOpportunity: TopOpportunity | null;
  // Command Centre improvement #8 (Top prospects block) — same `scored`
  // array topOpportunity was always the head of, just kept instead of
  // discarded. topOpportunity itself is unchanged: still exactly
  // topOpportunities[0] ?? null, so the existing Briefing card's own
  // "best opportunity right now" reads no differently than before.
  topOpportunities: TopOpportunity[];
  // Command Centre improvement #1 — same real rows followUpsDue was
  // always counted from, just kept instead of discarded (identical
  // "keep the list, not just its length" move as topOpportunities
  // above). Capped at MAX_FOLLOW_UPS_DUE; followUpsDue itself stays the
  // real, uncapped total.
  followUpsDueList: FollowUpDue[];
};

const MAX_TOP_OPPORTUNITIES = 5;
const MAX_FOLLOW_UPS_DUE = 5;

export async function getStudioBriefing(supabase: SupabaseClient, orgId: string): Promise<StudioBriefing> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, business_name, status, created_at, research, sales_kit, score_breakdown, contacted_at, last_contact_method, replied_at")
    .eq("org_id", orgId);

  const rows = prospects ?? [];
  const active = rows.filter((p) => p.status !== "converted");

  const newThisWeek = rows.filter((p) => p.created_at >= sevenDaysAgo).length;
  const needsResearch = active.filter((p) => !p.research).length;
  const readyToContact = active.filter((p) => p.research && p.sales_kit).length;

  const dueForFollowUp = active
    .map((p) => ({ prospect: p, nextAction: getLeadCadenceAction(p) }))
    .filter((x): x is { prospect: (typeof active)[number]; nextAction: "call" | "follow_up" } => x.nextAction !== null);
  const followUpsDue = dueForFollowUp.length;
  const followUpsDueList: FollowUpDue[] = dueForFollowUp
    .slice(0, MAX_FOLLOW_UPS_DUE)
    .map(({ prospect, nextAction }) => ({ id: prospect.id, businessName: prospect.business_name, nextAction }));

  const scored = active
    .filter((p) => p.research && p.score_breakdown)
    .sort((a, b) => (b.score_breakdown?.overall ?? 0) - (a.score_breakdown?.overall ?? 0));

  const topOpportunities: TopOpportunity[] = scored.slice(0, MAX_TOP_OPPORTUNITIES).map((p) => ({
    id: p.id,
    businessName: p.business_name,
    pursueBecause: p.research.pursue_because,
    overallScore: p.score_breakdown.overall,
    hasSalesKit: Boolean(p.sales_kit),
  }));
  const topOpportunity = topOpportunities[0] ?? null;

  return { newThisWeek, needsResearch, readyToContact, followUpsDue, topOpportunity, topOpportunities, followUpsDueList };
}
