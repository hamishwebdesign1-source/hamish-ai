import Link from "next/link";
import { redirect } from "next/navigation";
import {
  HeartPulse,
  ArrowRight,
  CheckCircle2,
  MessageCircleQuestion,
  Receipt,
  Sparkles,
  ListChecks,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getPortalMembership } from "@/lib/portal-membership";
import { isInvoiceOverdue } from "@/lib/invoice-status";
import { AskSupportAgent } from "@/components/portal/ask-support-agent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequestStatusBadge } from "@/components/status-badges";

// Client portal redesign Phase 2 — deliberately not calling
// buildPortalInsights() here, even though it computes some overlapping
// numbers: that function re-fetches requests/tasks/invoices/site_checks
// itself, and Home is the single most-loaded page in the portal — paying
// for a second full fetch-and-compute pass (12 months of trend, demand
// pattern by day-of-week) on every visit just to reuse a couple of counts
// isn't worth it. Same "deliberately lean, not the full computation"
// principle getRecentPortalEvents() already established for the header's
// notification bell — Home does its own light, targeted queries instead.
function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

type ActionItem = { id: string; label: string; href: string };

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
    .select("id, raw_text, status, created_at, auto_sent")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: tasks } = requestIds.length
    ? await supabase.from("tasks").select("id, request_id, title, status").in("request_id", requestIds)
    : { data: [] };

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, amount_pence, status, due_date")
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

  const awaitingRequests = requests?.filter((r) => r.status === "awaiting_info") ?? [];
  const overdueInvoices = invoices?.filter(isInvoiceOverdue) ?? [];
  const inProgressTasks = tasks?.filter((t) => t.status !== "done") ?? [];
  const autoReplyCount = requests?.filter((r) => r.auto_sent).length ?? 0;
  const recentRequests = requests?.slice(0, 3) ?? [];

  // "Your Actions" — the brief's central ask: a real list of what's
  // genuinely waiting on the client, not just a stat-card count. Every
  // item here is something the client can actually go and do right now.
  const actions: ActionItem[] = [
    ...awaitingRequests.map((r) => ({
      id: `req-${r.id}`,
      label: `Answer a question about: ${r.raw_text.length > 60 ? `${r.raw_text.slice(0, 60)}…` : r.raw_text}`,
      href: "/portal/requests",
    })),
    ...overdueInvoices.map((inv) => ({
      id: `inv-${inv.id}`,
      label: `Pay overdue invoice — £${(inv.amount_pence / 100).toFixed(2)}${inv.due_date ? `, was due ${new Date(inv.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}`,
      href: "/portal/billing",
    })),
  ];

  // The one-line status underneath the greeting — honest, built from real
  // counts, no fabricated "your project is progressing well" filler when
  // there's nothing to report yet.
  const statusLine =
    actions.length > 0
      ? `You have ${actions.length} thing${actions.length === 1 ? "" : "s"} that need${actions.length === 1 ? "s" : ""} your attention.`
      : inProgressTasks.length > 0
        ? `We're currently working on ${inProgressTasks.length} thing${inProgressTasks.length === 1 ? "" : "s"} for you.`
        : "You're all caught up — nothing outstanding right now.";

  return (
    <div>
      <h1 className="text-page-title">
        {greeting()}, {client.name || client.business_name}
      </h1>
      <p className="text-page-subtitle mt-1">{statusLine}</p>

      <section className="mt-8">
        <h2 className="text-section-title">Your actions</h2>
        <Card className="mt-3">
          <CardContent className="pt-6">
            {!actions.length ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="size-6 text-success" />
                <p>Nothing needs you right now — we&apos;ll let you know when it does.</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {actions.map((action) => (
                  <li key={action.id}>
                    <Link
                      href={action.href}
                      className="card-interactive flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/5 px-3.5 py-2.5 text-sm"
                    >
                      <span className="flex items-center gap-2 text-foreground">
                        <MessageCircleQuestion className="size-4 shrink-0 text-warning" />
                        {action.label}
                      </span>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="text-section-title">HamishAI is working on</h2>
        <Card className="mt-3">
          <CardContent className="space-y-3 pt-6">
            {!inProgressTasks.length && !autoReplyCount && !latestCheck ? (
              <p className="text-sm text-muted-foreground">Nothing in progress right now.</p>
            ) : (
              <>
                {inProgressTasks.length > 0 && (
                  <ul className="space-y-2">
                    {inProgressTasks.slice(0, 5).map((t) => (
                      <li key={t.id} className="flex items-center gap-2 text-sm">
                        <ListChecks className="size-4 shrink-0 text-accent" />
                        {t.title}
                      </li>
                    ))}
                  </ul>
                )}
                {autoReplyCount > 0 && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="size-4 shrink-0 text-[var(--gradient-violet)]" />
                    {autoReplyCount} repl{autoReplyCount === 1 ? "y was" : "ies were"} sent automatically — no wait
                    on a human.
                  </p>
                )}
                {latestCheck && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <HeartPulse className="size-4 shrink-0 text-accent" />
                    Your site is being monitored — last checked{" "}
                    {new Date(latestCheck.checked_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {latestCheck?.ai_summary && (
        <Card className="mt-8 bg-secondary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-eyebrow text-accent">
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
                <Receipt className="size-6 text-muted-foreground/60" />
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
