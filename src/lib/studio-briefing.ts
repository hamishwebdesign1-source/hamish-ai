import type { SupabaseClient } from "@supabase/supabase-js";
import { leadNeedsFollowUp } from "@/lib/lead-status";

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

export type StudioBriefing = {
  newThisWeek: number;
  needsResearch: number;
  readyToContact: number; // researched, has a sales kit, not yet converted
  followUpsDue: number; // contacted, no reply, past the cadence threshold (lead-status.ts)
  topOpportunity: { id: string; businessName: string; pursueBecause: string; overallScore: number } | null;
};

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
  const followUpsDue = active.filter((p) => leadNeedsFollowUp(p)).length;

  const scored = active
    .filter((p) => p.research && p.score_breakdown)
    .sort((a, b) => (b.score_breakdown?.overall ?? 0) - (a.score_breakdown?.overall ?? 0));

  const top = scored[0];
  const topOpportunity = top
    ? {
        id: top.id,
        businessName: top.business_name,
        pursueBecause: top.research.pursue_because,
        overallScore: top.score_breakdown.overall,
      }
    : null;

  return { newThisWeek, needsResearch, readyToContact, followUpsDue, topOpportunity };
}
