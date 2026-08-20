import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getUsageStatus } from "@/lib/usage-limits";
import type { PlatformPlanSlug } from "@/lib/platform-plans";
import { ProspectingPanel } from "@/components/platform/prospecting-panel";

// Server-side data assembly only — every write (settings, running
// discovery) happens through actions.ts's Server Actions, called from the
// client component below. Same split as everywhere else in this app:
// pages read, actions write.
export default async function StudioProspectsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  const { data: org } = await supabase
    .from("organisations")
    .select("prospecting_config, is_internal, plan")
    .eq("id", membership.orgId)
    .single();

  const config = (org?.prospecting_config ?? {}) as { categories?: string[]; areas?: string[] };

  const usage = org?.is_internal
    ? null
    : await getUsageStatus(membership.orgId, "prospect_researched", (org?.plan ?? "starter") as PlatformPlanSlug);

  // Session-scoped client, not the service-role client — RLS
  // (prospects_select_own_org, schema-rls-prospects.sql) enforces the same
  // org boundary independently of this .eq() getting it right.
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, business_name, category, neighbourhood, website, email, phone, status, score, score_breakdown, research, research_generated_at, website_mockup, sales_kit, contacted_at, last_contact_method, replied_at, deal_value_pence, created_at")
    .eq("org_id", membership.orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <ProspectingPanel
      initialCategories={config.categories ?? []}
      initialAreas={config.areas ?? []}
      usage={usage}
      prospects={prospects ?? []}
    />
  );
}
