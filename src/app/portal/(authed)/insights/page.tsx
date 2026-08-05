import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getPortalMembership } from "@/lib/portal-membership";
import { buildPortalInsights } from "@/lib/portal-insights-data";
import { InsightsCentre } from "@/components/portal/insights-centre";

export default async function PortalInsightsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  // Reads from here on use this session-bound client, not the service-role
  // client — Postgres RLS (schema-client-members.sql) enforces that this
  // query, and every query buildPortalInsights makes, can only ever return
  // rows belonging to a client this signed-in user is a member of.
  const membership = await getPortalMembership(supabase, user.email);
  if (!membership) redirect("/portal/login");

  const insights = await buildPortalInsights(supabase, membership.clientId);
  if ("error" in insights) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-semibold">Insights</h1>
        <p className="mt-4 text-sm text-destructive">{insights.error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Insights</h1>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        Your AI Business Analytics, built from your own account — request activity, site health, and spend. No
        fabricated revenue or booking figures — this is the same Command Centre experience, running on your data.
      </p>

      <div className="mt-6">
        <InsightsCentre data={insights} />
      </div>
    </div>
  );
}
