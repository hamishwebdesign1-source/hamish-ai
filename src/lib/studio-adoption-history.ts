import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { computeClientAiAdoption } from "@/lib/studio-ai-adoption";

// Command Centre improvement #8 (Adoption trend chart) — Client AI
// Adoption (studio-ai-adoption.ts) has always been a single live number
// with no history, the same original gap Business Health's own trend
// (studio-health-history.ts) fixed for that card. Two halves, same
// shape as that module: snapshotAdoptionForAllOrgs() is the weekly
// cron write, getAdoptionSeries() is the dashboard's chart read.
//
// Deliberately NOT a new scheduled job — snapshotAdoptionForAllOrgs()
// is called from the existing weekly health-snapshot cron (api/cron/
// health-snapshot), not a 14th vercel.json entry, given this session's
// own repeated flag that the cron count is already worth a Vercel plan
// check. Architecturally the same shape (one real snapshot per org,
// once a week) as that cron already runs, just a second, independent
// write inside it — kept in its own lib file/table so the two concerns
// (health, adoption) stay as separable reads as they were before, even
// though they now share one trigger.

export async function snapshotAdoptionForAllOrgs() {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." as const };

  const { data: orgs, error: orgsError } = await admin.from("organisations").select("id");
  if (orgsError) return { error: "Failed to fetch organisations." as const };

  const snapshotted: string[] = [];

  for (const org of orgs ?? []) {
    const { data: clients } = await admin.from("clients").select("id, chatbot_embed_enabled").eq("org_id", org.id);
    const adoption = computeClientAiAdoption(clients ?? []);
    if (adoption.adoptionPct === null) continue; // no clients yet — nothing real to record

    const { error } = await admin
      .from("studio_adoption_snapshots")
      .insert({ org_id: org.id, adoption_pct: adoption.adoptionPct });
    if (error) {
      console.error(`Failed to snapshot AI adoption for org ${org.id}:`, error);
      continue;
    }
    snapshotted.push(org.id);
  }

  return { snapshotted };
}

export type AdoptionSeriesPoint = { label: string; value: number };

const ADOPTION_SERIES_LIMIT = 12; // ~3 months of weekly snapshots — a chart, not an unbounded log

// The dashboard's own chart-block read side. Real snapshots only, oldest
// to newest — no bucketing/interpolation the way studio-analytics.ts's
// revenue/prospects series need, since one snapshot a week already is a
// real weekly point.
export async function getAdoptionSeries(admin: SupabaseClient, orgId: string): Promise<AdoptionSeriesPoint[]> {
  const { data } = await admin
    .from("studio_adoption_snapshots")
    .select("adoption_pct, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(ADOPTION_SERIES_LIMIT);

  return (data ?? [])
    .slice()
    .reverse()
    .map((row) => ({
      label: new Date(row.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      value: row.adoption_pct,
    }));
}
