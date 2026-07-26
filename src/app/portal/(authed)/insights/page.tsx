import { redirect } from "next/navigation";
import { MessagesSquare, Wallet, HeartPulse } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { VerticalBarChart, UptimeBar } from "@/components/portal/insight-charts";

function lastNMonths(n: number) {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-GB", { month: "short" }) });
  }
  return months;
}

export default async function PortalInsightsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const admin = getSupabaseAdmin();
  if (!admin) redirect("/portal/login");

  const { data: client } = await admin.from("clients").select("*").eq("email", user.email).single();
  if (!client) redirect("/portal/login");

  const { data: requests } = await admin
    .from("requests")
    .select("created_at, status")
    .eq("client_id", client.id);

  const { data: invoices } = await admin
    .from("invoices")
    .select("amount_pence, paid_at, status")
    .eq("client_id", client.id)
    .eq("status", "paid");

  const { data: siteChecks } = client.website_url
    ? await admin
        .from("site_checks")
        .select("checked_at, uptime_ok, response_ms")
        .eq("client_id", client.id)
        .order("checked_at", { ascending: false })
        .limit(14)
    : { data: [] };

  const months = lastNMonths(6);
  const monthKey = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${d.getMonth()}`;
  };

  const requestsByMonth = months.map((m) => ({
    label: m.label,
    value: (requests ?? []).filter((r) => monthKey(r.created_at) === m.key).length,
  }));

  const spendByMonth = months.map((m) => ({
    label: m.label,
    value: (invoices ?? [])
      .filter((inv) => inv.paid_at && monthKey(inv.paid_at) === m.key)
      .reduce((sum, inv) => sum + inv.amount_pence, 0) / 100,
  }));

  const totalRequests = requests?.length ?? 0;
  const totalPaid = (invoices ?? []).reduce((sum, inv) => sum + inv.amount_pence, 0) / 100;

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Insights</h1>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        What we actually know about your account — request activity, site health, and spend. This isn&apos;t a
        business-performance dashboard (we don&apos;t have access to your revenue or bookings data), just an honest
        picture of the work we&apos;re doing together.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <MessagesSquare className="size-4 text-accent" />
              Requests over time
            </CardTitle>
            <CardDescription>{totalRequests} total since we started working together</CardDescription>
          </CardHeader>
          <CardContent>
            <VerticalBarChart data={requestsByMonth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Wallet className="size-4 text-accent" />
              Spend over time
            </CardTitle>
            <CardDescription>£{totalPaid.toFixed(2)} paid in total</CardDescription>
          </CardHeader>
          <CardContent>
            <VerticalBarChart data={spendByMonth} formatValue={(v) => `£${v.toFixed(0)}`} />
          </CardContent>
        </Card>
      </div>

      {client.website_url && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <HeartPulse className="size-4 text-accent" />
              Site health
            </CardTitle>
            <CardDescription>Automated checks against {client.website_url}</CardDescription>
          </CardHeader>
          <CardContent>
            {siteChecks?.length ? (
              <UptimeBar checks={siteChecks} />
            ) : (
              <p className="text-sm text-muted-foreground">No checks recorded yet — the first one runs within 24 hours.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
