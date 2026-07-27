import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { buildPortalInsights } from "@/lib/portal-insights-data";
import { InsightsCentre } from "@/components/portal/insights-centre";

export default async function PortalInsightsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const admin = getSupabaseAdmin();
  if (!admin) redirect("/portal/login");

  const { data: client } = await admin.from("clients").select("id").eq("email", user.email).single();
  if (!client) redirect("/portal/login");

  const insights = await buildPortalInsights(client.id);
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
