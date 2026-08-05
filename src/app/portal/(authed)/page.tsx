import Link from "next/link";
import { redirect } from "next/navigation";
import { HeartPulse, MessagesSquare, ListChecks, Receipt, ArrowRight, CheckCircle2 } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getPortalMembership } from "@/lib/portal-membership";
import { AskSupportAgent } from "@/components/portal/ask-support-agent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequestStatusBadge } from "@/components/status-badges";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "warning" | "success";
}) {
  const toneClasses = {
    default: "text-accent bg-accent/10",
    warning: "text-warning bg-warning/15",
    success: "text-success bg-success/15",
  }[tone];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className={`flex size-7 items-center justify-center rounded-lg ${toneClasses}`}>
          <Icon className="size-4" />
        </span>
        <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      </div>
      <p className="mt-3 font-heading text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default async function PortalHomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const membership = await getPortalMembership(supabase, user.email);
  if (!membership) redirect("/portal/login");
  const clientId = membership.clientId;

  // Session-scoped client from here on — RLS (schema-client-members.sql)
  // means these queries can only ever return this one client's rows.
  const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).single();
  if (!client) redirect("/portal/login");

  const { data: requests } = await supabase
    .from("requests")
    .select("id, raw_text, status, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: tasks } = requestIds.length
    ? await supabase.from("tasks").select("id, status").in("request_id", requestIds)
    : { data: [] };

  const { data: invoices } = await supabase
    .from("invoices")
    .select("amount_pence, status, due_date")
    .eq("client_id", clientId)
    .neq("status", "paid")
    .order("due_date", { ascending: true });

  const { data: siteChecks } = client.website_url
    ? await supabase
        .from("site_checks")
        .select("ai_summary, uptime_ok, checked_at")
        .eq("client_id", clientId)
        .order("checked_at", { ascending: false })
        .limit(1)
    : { data: [] };
  const latestCheck = siteChecks?.[0] ?? null;

  const needsInputCount = requests?.filter((r) => r.status === "awaiting_info").length ?? 0;
  const openTasksCount = tasks?.filter((t) => t.status !== "done").length ?? 0;
  const nextInvoice = invoices?.[0] ?? null;
  const recentRequests = requests?.slice(0, 3) ?? [];

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Hi {client.name || client.business_name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{client.business_name}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={MessagesSquare}
          label="Needs your input"
          value={String(needsInputCount)}
          sub={needsInputCount > 0 ? "Waiting on you" : "All caught up"}
          tone={needsInputCount > 0 ? "warning" : "default"}
        />
        <StatCard
          icon={ListChecks}
          label="In progress"
          value={String(openTasksCount)}
          sub={openTasksCount > 0 ? "Being worked on" : "Nothing open"}
        />
        <StatCard
          icon={Receipt}
          label="Next invoice"
          value={nextInvoice ? `£${(nextInvoice.amount_pence / 100).toFixed(2)}` : "—"}
          sub={
            nextInvoice?.due_date
              ? `Due ${new Date(nextInvoice.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
              : "All settled"
          }
        />
        {client.website_url && (
          <StatCard
            icon={HeartPulse}
            label="Site status"
            value={latestCheck ? (latestCheck.uptime_ok ? "Online" : "Issue found") : "Checking…"}
            sub={latestCheck ? "Last checked today" : "First check pending"}
            tone={latestCheck?.uptime_ok === false ? "warning" : "success"}
          />
        )}
      </div>

      {latestCheck?.ai_summary && (
        <Card className="mt-6 bg-secondary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 font-mono text-xs font-medium tracking-wide text-accent uppercase">
              <HeartPulse className="size-3.5" />
              Website health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{latestCheck.ai_summary}</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <AskSupportAgent clientId={client.id} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              Recent requests
              <Button variant="link" size="sm" className="h-auto px-0" render={<Link href="/portal/requests" />}>
                View all
                <ArrowRight className="size-3.5" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentRequests.length && (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="size-6 text-muted-foreground/60" />
                <p>Nothing yet.</p>
                <Button size="sm" render={<Link href="/portal/requests" />}>
                  Submit a request
                </Button>
              </div>
            )}
            <ul className="space-y-3">
              {recentRequests.map((r) => (
                <li key={r.id} className="rounded-lg border border-border px-3 py-2.5">
                  <p className="line-clamp-2 text-sm font-medium">{r.raw_text}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <RequestStatusBadge status={r.status} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
