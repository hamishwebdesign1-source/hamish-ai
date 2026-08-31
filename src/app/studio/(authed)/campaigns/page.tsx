import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { CampaignsPanel } from "@/components/platform/campaigns-panel";

// Session-scoped client throughout — RLS (campaigns_select_own_org,
// schema-rls-campaigns.sql) enforces the same org boundary independently
// of the .eq() below getting it right.
export default async function StudioCampaignsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  const [{ data: campaigns }, { data: prospects }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, objective, status, created_at")
      .eq("org_id", membership.orgId)
      .order("created_at", { ascending: false }),
    // Every prospect, not just already-assigned ones — the "add
    // prospects to this campaign" control needs to offer the unassigned
    // ones too. deal_value_pence added (Studio improvement) so each
    // campaign can show a real, summed pipeline value — the same
    // tenant-entered field prospecting-panel.tsx already surfaces per
    // prospect, never AI-estimated (updateProspectDealValue()'s own
    // comment on why).
    supabase
      .from("prospects")
      .select("id, business_name, campaign_id, status, deal_value_pence")
      .eq("org_id", membership.orgId)
      .order("business_name"),
  ]);

  return <CampaignsPanel campaigns={campaigns ?? []} prospects={prospects ?? []} />;
}
