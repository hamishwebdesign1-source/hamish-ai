import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { computeAgencyHealth } from "@/lib/client-health";

// Command Centre improvement #3 — Business Health trend
// (schema-studio-health-snapshots.sql). Two halves: snapshotHealthForAllOrgs()
// is the weekly cron write, getHealthTrend() is the dashboard's read.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Weekly cron entry — computes the exact same computeAgencyHealth() the
// dashboard itself renders with, for every org, off the same real tables
// (requests/tasks/invoices/site_checks/prospects/clients) page.tsx already
// queries for one org at a time. Only orgs computeAgencyHealth() actually
// returns a real score for get a row — an org with nothing real yet is
// silently skipped, not backfilled with a fabricated 0.
export async function snapshotHealthForAllOrgs() {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." as const };

  const { data: orgs, error: orgsError } = await admin.from("organisations").select("id");
  if (orgsError) return { error: "Failed to fetch organisations." as const };

  const snapshotted: string[] = [];

  for (const org of orgs ?? []) {
    const [{ count: prospectCount }, { data: clients }] = await Promise.all([
      admin.from("prospects").select("id", { count: "exact", head: true }).eq("org_id", org.id),
      admin.from("clients").select("id").eq("org_id", org.id),
    ]);
    const clientIds = (clients ?? []).map((c) => c.id);

    const [{ data: requests }, { data: invoices }, { data: siteChecks }] = clientIds.length
      ? await Promise.all([
          admin.from("requests").select("id, status").in("client_id", clientIds),
          admin.from("invoices").select("status, due_date, paid_at").in("client_id", clientIds),
          admin.from("site_checks").select("uptime_ok").in("client_id", clientIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

    const requestIds = (requests ?? []).map((r) => r.id);
    const { data: tasks } = requestIds.length
      ? await admin.from("tasks").select("id, request_id, status").in("request_id", requestIds)
      : { data: [] };

    const agencyHealth = computeAgencyHealth({
      requests: requests ?? [],
      tasks: tasks ?? [],
      invoices: invoices ?? [],
      siteChecks: siteChecks ?? [],
      prospectCount: prospectCount ?? 0,
      clientCount: clientIds.length,
    });

    if (agencyHealth.healthScore === null) continue;

    const { error } = await admin
      .from("studio_health_snapshots")
      .insert({ org_id: org.id, health_score: agencyHealth.healthScore });
    if (error) {
      console.error(`Failed to snapshot health for org ${org.id}:`, error);
      continue;
    }
    snapshotted.push(org.id);
  }

  return { snapshotted };
}

export type HealthTrend = { deltaValue: number; daysAgo: number };

// How far back is "old enough" to compare against — a week or two of
// history is too noisy to call a trend; three weeks is a real enough gap
// to say something changed. The closest snapshot older than this bar
// (not the closest to exactly 21 days) is used, so the label can just
// say how many days ago it actually was rather than rounding to a
// nominal "3 weeks" that isn't the true gap.
const TREND_LOOKBACK_DAYS = 21;

export async function getHealthTrend(admin: SupabaseClient, orgId: string, currentScore: number): Promise<HealthTrend | null> {
  const cutoff = new Date(Date.now() - TREND_LOOKBACK_DAYS * MS_PER_DAY).toISOString();
  const { data } = await admin
    .from("studio_health_snapshots")
    .select("health_score, created_at")
    .eq("org_id", orgId)
    .lte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const daysAgo = Math.round((Date.now() - new Date(data.created_at).getTime()) / MS_PER_DAY);
  return { deltaValue: currentScore - data.health_score, daysAgo };
}
