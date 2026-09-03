import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getStudioAnalytics, type AnalyticsRange } from "@/lib/studio-analytics";
import { AnalyticsPanel } from "@/components/platform/analytics-panel";

// SEO/metadata audit (2 Sep 2026) — see studio/(authed)/page.tsx for the
// full reasoning (every real page under here gets its own real title).
export const metadata: Metadata = { title: "Analytics | Studio" };

const VALID_RANGES: AnalyticsRange[] = ["7d", "30d", "90d", "12m"];

// Command Centre Phase 2 — session-scoped client throughout, same
// convention as every other /studio page. Range travels as a real URL
// query param (not client-only state) so each range is a real,
// bookmarkable, server-rendered page — not a client-side re-fetch behind
// a loading spinner.
export default async function StudioAnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  const { range: rawRange } = await searchParams;
  const range: AnalyticsRange = VALID_RANGES.includes(rawRange as AnalyticsRange) ? (rawRange as AnalyticsRange) : "30d";

  const data = await getStudioAnalytics(supabase, membership.orgId, range);

  return <AnalyticsPanel data={data} />;
}
