import { redirect } from "next/navigation";
import { MessagesSquare, Wallet, HeartPulse } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { HealthRing } from "@/components/analytics/health-ring";
import { VerticalBarChart, UptimeBar, uptimePercent } from "@/components/portal/insight-charts";

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
  const uptimePct = client.website_url ? uptimePercent(siteChecks ?? []) : null;

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Insights</h1>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        What we actually know about your account — request activity, site health, and spend.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-primary text-primary-foreground shadow-2xl shadow-accent/20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            <p className="font-mono text-xs font-medium tracking-[0.15em] text-primary-foreground/70 uppercase">
              {client.business_name}
            </p>
          </div>
          <span className="font-mono text-[11px] tracking-wide text-primary-foreground/40 uppercase">
            Real account data — not illustrative
          </span>
        </div>

        <div className="p-5 md:p-6">
          <p className="max-w-xl text-sm text-primary-foreground/70">
            This isn&apos;t a business-performance dashboard — we don&apos;t have access to your revenue or bookings
            data, only what runs through us. Just an honest picture of the work we&apos;re doing together.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
              <div className="flex items-center gap-1.5">
                <MessagesSquare className="size-4 text-accent" />
                <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">
                  Requests over time
                </p>
              </div>
              <p className="mt-1 text-xs text-primary-foreground/50">
                {totalRequests} total since we started working together
              </p>
              <div className="mt-5">
                <VerticalBarChart data={requestsByMonth} />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
              <div className="flex items-center gap-1.5">
                <Wallet className="size-4 text-accent" />
                <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">
                  Spend over time
                </p>
              </div>
              <p className="mt-1 text-xs text-primary-foreground/50">£{totalPaid.toFixed(2)} paid in total</p>
              <div className="mt-5">
                <VerticalBarChart data={spendByMonth} formatValue={(v) => `£${v.toFixed(0)}`} />
              </div>
            </div>
          </div>

          {client.website_url && (
            <div className="mt-4 rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <HeartPulse className="size-4 text-accent" />
                    <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">
                      Site health
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-primary-foreground/50">Automated checks against {client.website_url}</p>
                </div>
                {uptimePct !== null && (
                  <HealthRing score={uptimePct} size={72} strokeWidth={7} centerLabel={`${uptimePct}%`} centerSublabel="uptime" />
                )}
              </div>
              <div className="mt-5">
                {siteChecks?.length ? (
                  <UptimeBar checks={siteChecks} />
                ) : (
                  <p className="text-sm text-primary-foreground/60">
                    No checks recorded yet — the first one runs within 24 hours.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
