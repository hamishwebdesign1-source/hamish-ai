import Link from "next/link";
import {
  Receipt,
  HelpCircle,
  Clock,
  Globe,
  CheckCircle2,
  AlertOctagon,
  TrendingUp,
  Flame,
  CalendarClock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isInvoiceOverdue } from "@/lib/invoice-status";
import { leadNeedsFollowUp } from "@/lib/lead-status";
import { timeAgo } from "@/lib/time-ago";
import { AI_ACTIVITY_ACTIONS, describeAiActivity, aiActivityHref } from "@/lib/ai-activity";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// No searchParams and no dynamic API usage — Next was statically
// prerendering this at build time and freezing it there (confirmed by
// comparing Stage 5's build output to Stage 4's; the Automation page just
// built has the identical gap, fixed alongside this one). A "Command
// Centre" showing build-time-frozen invoice/lead/AI-activity data is a
// real correctness bug, not a style nit.
export const dynamic = "force-dynamic";

type ClientRef = { business_name: string } | null;

// Escalation thresholds — a second, more urgent tier on top of the existing
// "needs attention" flags, so a request stuck for 3 days doesn't read the
// same as one stuck for 3 weeks. Day counts are deliberately more generous
// than the base flag (e.g. an invoice is "overdue" the moment its due date
// passes, but only "critical" after CRITICAL_INVOICE_DAYS more).
const CRITICAL_INVOICE_DAYS = 14;
const CRITICAL_AWAITING_INFO_DAYS = 7;
const CRITICAL_LEAD_FOLLOWUP_DAYS = 14;

// Portal redesign Stage 3 — the "pipeline forecast" idea from Quick Win #4
// in leads-automation-plan.md (never built until now): rough per-band
// midpoints, deliberately not precise — this is for prioritisation, same
// framing research-lead.ts already uses for these bands, never a quote.
const VALUE_BAND_MIDPOINT: Record<string, number> = {
  "£500-£1,500": 1000,
  "£1,500-£3,000": 2250,
  "£3,000-£6,000": 4500,
  "£6,000+": 6000,
};
const CONVERSION_WEIGHT: Record<string, number> = { low: 0.2, medium: 0.5, high: 0.8 };

function formatGBP(n: number) {
  return `£${Math.round(n).toLocaleString("en-GB")}`;
}

function daysSince(dateStr: string) {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
}

function CriticalBadge() {
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertOctagon className="size-3" />
      Critical
    </Badge>
  );
}

export default async function AdminOverviewPage() {
  const supabase = getSupabaseAdmin();

  const [
    { data: openInvoices },
    { data: awaitingRequestsRaw },
    { data: contactedLeads },
    { data: recentChecks },
    { data: researchedLeads },
    { data: todaysMeetingsRaw },
    { data: aiActivityRaw },
  ] = await Promise.all([
    supabase
      ? supabase
          .from("invoices")
          .select("id, client_id, amount_pence, description, due_date, status, clients(business_name)")
          .eq("status", "open")
      : Promise.resolve({ data: [] }),
    supabase
      ? supabase
          .from("requests")
          .select("id, client_id, raw_text, category, created_at, clients(business_name)")
          .eq("status", "awaiting_info")
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase
      ? supabase.from("prospects").select("id, business_name, contacted_at, status").eq("status", "contacted")
      : Promise.resolve({ data: [] }),
    supabase
      ? supabase
          .from("site_checks")
          .select("client_id, uptime_ok, ssl_ok, broken_links, checked_at, clients(business_name)")
          .order("checked_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] }),
    // Pipeline value / hot leads — active leads (not "not a good fit")
    // with a cached research pass already run. Zero extra AI cost: this
    // reads the jsonb column researchLead() already wrote, no new calls.
    supabase
      ? supabase.from("prospects").select("id, business_name, score, research, status").neq("status", "not_fit").not("research", "is", null)
      : Promise.resolve({ data: [] }),
    supabase
      ? supabase
          .from("lead_meetings")
          .select("id, scheduled_start, join_url, prospects(business_name)")
          .eq("status", "scheduled")
          .order("scheduled_start", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase
      ? supabase
          .from("audit_log")
          .select("id, action, created_at, metadata, target_id, target_type, client_id")
          .in("action", AI_ACTIVITY_ACTIONS as unknown as string[])
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),
  ]);

  const overdueInvoices = (openInvoices ?? [])
    .filter(isInvoiceOverdue)
    .map((inv) => ({ ...inv, daysOverdue: inv.due_date ? daysSince(inv.due_date) : 0 }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
  const criticalInvoiceCount = overdueInvoices.filter((inv) => inv.daysOverdue >= CRITICAL_INVOICE_DAYS).length;

  const awaitingRequests = (awaitingRequestsRaw ?? [])
    .map((r) => ({ ...r, daysWaiting: daysSince(r.created_at) }))
    .sort((a, b) => b.daysWaiting - a.daysWaiting);
  const criticalAwaitingCount = awaitingRequests.filter((r) => r.daysWaiting >= CRITICAL_AWAITING_INFO_DAYS).length;

  const staleLeads = (contactedLeads ?? [])
    .filter(leadNeedsFollowUp)
    .map((lead) => ({ ...lead, daysSinceContact: lead.contacted_at ? daysSince(lead.contacted_at) : 0 }))
    .sort((a, b) => b.daysSinceContact - a.daysSinceContact);
  const criticalLeadCount = staleLeads.filter((l) => l.daysSinceContact >= CRITICAL_LEAD_FOLLOWUP_DAYS).length;

  const latestPerClient = new Map<string, NonNullable<typeof recentChecks>[number]>();
  for (const check of recentChecks ?? []) {
    if (!latestPerClient.has(check.client_id)) latestPerClient.set(check.client_id, check);
  }
  const siteIssues = Array.from(latestPerClient.values())
    .filter((c) => c.uptime_ok === false || c.ssl_ok === false || (Array.isArray(c.broken_links) && c.broken_links.length > 0))
    .sort((a, b) => (a.uptime_ok === false ? -1 : 0) - (b.uptime_ok === false ? -1 : 0));
  const criticalSiteCount = siteIssues.filter((c) => c.uptime_ok === false).length;

  const totalAttentionItems =
    overdueInvoices.length + awaitingRequests.length + staleLeads.length + siteIssues.length;
  const totalCritical = criticalInvoiceCount + criticalAwaitingCount + criticalLeadCount + criticalSiteCount;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leadsWithResearch = (researchedLeads ?? []) as any[];
  let pipelineValue = 0;
  let expectedRevenue = 0;
  let hotLeadCount = 0;
  for (const lead of leadsWithResearch) {
    const band = lead.research?.estimated_project_value_band as string | undefined;
    const probability = lead.research?.conversion_probability_band as string | undefined;
    const midpoint = band ? (VALUE_BAND_MIDPOINT[band] ?? 0) : 0;
    pipelineValue += midpoint;
    expectedRevenue += midpoint * (probability ? (CONVERSION_WEIGHT[probability] ?? 0) : 0);
    if (probability === "high") hotLeadCount++;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysMeetings = (todaysMeetingsRaw ?? []).filter((m) => m.scheduled_start.slice(0, 10) === todayStr);

  const aiActivity = aiActivityRaw ?? [];

  return (
    <div>
      <p className="text-eyebrow">Command Centre</p>
      <h1 className="text-page-title mt-1">Good to see you, Hamish</h1>
      <p className="text-page-subtitle mt-1">
        {totalCritical > 0 ? (
          <span className="font-medium text-destructive">
            {totalCritical} critical item{totalCritical === 1 ? "" : "s"} need attention.
          </span>
        ) : (
          "Everything's running — here's what's happening across the business."
        )}
      </p>

      {/* Every number here is a link to the workflow it summarises, not a
          decorative stat — the brief's own "every metric should lead to an
          actionable workflow" principle, applied literally. */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Link href="/admin/leads">
          <Card className="card-interactive h-full p-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="size-3" />
              Pipeline value
            </p>
            <p className="text-page-title mt-1">{formatGBP(pipelineValue)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatGBP(expectedRevenue)} expected</p>
          </Card>
        </Link>
        <Link href="/admin/leads?insight=hot">
          <Card className="card-interactive h-full p-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="size-3" />
              Hot leads
            </p>
            <p className="text-page-title mt-1">{hotLeadCount}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">high conversion probability</p>
          </Card>
        </Link>
        <Link href="/admin/ms-setup">
          <Card className="card-interactive h-full p-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3" />
              Meetings today
            </p>
            <p className="text-page-title mt-1">{todaysMeetings.length}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Teams, scheduled</p>
          </Card>
        </Link>
        <a href="#needs-attention">
          <Card className="card-interactive h-full p-4">
            <p
              className={`flex items-center gap-1 text-xs ${totalCritical > 0 ? "text-destructive" : "text-muted-foreground"}`}
            >
              <AlertOctagon className="size-3" />
              Needs attention
            </p>
            <p className={`text-page-title mt-1 ${totalCritical > 0 ? "text-destructive" : ""}`}>{totalAttentionItems}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{totalCritical} critical</p>
          </Card>
        </a>
        <Link href="/admin/activity-log">
          <Card className="card-interactive h-full p-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="size-3" />
              AI actions
            </p>
            <p className="text-page-title mt-1">{aiActivity.length}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">most recent</p>
          </Card>
        </Link>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div id="needs-attention">
          <p className="text-section-title">Needs your attention</p>
          {totalAttentionItems === 0 ? (
            <Card className="mt-3">
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="size-6 text-success" />
                All caught up — nothing needs attention right now.
              </CardContent>
            </Card>
          ) : (
            <div className="mt-3 space-y-6">
              {overdueInvoices.length > 0 && (
                <section>
                  <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Receipt className="size-3.5 text-destructive" />
                    Overdue invoices
                  </h2>
                  <ul className="mt-2 space-y-2">
                    {overdueInvoices.map((inv) => (
                      <li key={inv.id}>
                        <Link
                          href={`/admin/clients/${inv.client_id}`}
                          className="card-interactive flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {(inv.clients as unknown as ClientRef)?.business_name ?? "Unknown client"}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {inv.description} · {Math.round(inv.daysOverdue)} day{Math.round(inv.daysOverdue) === 1 ? "" : "s"} overdue
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {inv.daysOverdue >= CRITICAL_INVOICE_DAYS && <CriticalBadge />}
                            <Badge variant="destructive">£{(inv.amount_pence / 100).toFixed(2)}</Badge>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {awaitingRequests.length > 0 && (
                <section>
                  <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <HelpCircle className="size-3.5 text-warning" />
                    Requests awaiting your info
                  </h2>
                  <ul className="mt-2 space-y-2">
                    {awaitingRequests.map((r) => (
                      <li key={r.id}>
                        <Link
                          href={`/admin/requests/${r.id}`}
                          className="card-interactive block rounded-lg border border-border bg-card px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">
                              {(r.clients as unknown as ClientRef)?.business_name ?? "Unknown client"}
                            </p>
                            {r.daysWaiting >= CRITICAL_AWAITING_INFO_DAYS && <CriticalBadge />}
                          </div>
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {r.raw_text} · waiting {Math.round(r.daysWaiting)} day{Math.round(r.daysWaiting) === 1 ? "" : "s"}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {staleLeads.length > 0 && (
                <section>
                  <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Clock className="size-3.5 text-warning" />
                    Leads need follow-up
                  </h2>
                  <ul className="mt-2 space-y-2">
                    {staleLeads.map((lead) => (
                      <li key={lead.id}>
                        <Link
                          href="/admin/leads?status=needs_followup"
                          className="card-interactive flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium">{lead.business_name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {Math.round(lead.daysSinceContact)} day{Math.round(lead.daysSinceContact) === 1 ? "" : "s"} since contact
                            </p>
                          </div>
                          {lead.daysSinceContact >= CRITICAL_LEAD_FOLLOWUP_DAYS && <CriticalBadge />}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {siteIssues.length > 0 && (
                <section>
                  <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Globe className="size-3.5 text-destructive" />
                    Site issues
                  </h2>
                  <ul className="mt-2 space-y-2">
                    {siteIssues.map((check) => (
                      <li key={check.client_id}>
                        <Link
                          href={`/admin/clients/${check.client_id}`}
                          className="card-interactive flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3"
                        >
                          <p className="text-sm font-medium">
                            {(check.clients as unknown as ClientRef)?.business_name ?? "Unknown client"}
                          </p>
                          <div className="flex gap-1.5">
                            {check.uptime_ok === false && <CriticalBadge />}
                            {check.uptime_ok === false && <Badge variant="destructive">Down</Badge>}
                            {check.ssl_ok === false && <Badge variant="destructive">SSL</Badge>}
                            {Array.isArray(check.broken_links) && check.broken_links.length > 0 && (
                              <Badge variant="warning">{check.broken_links.length} broken links</Badge>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>

        <div className="space-y-8">
          {todaysMeetings.length > 0 && (
            <div>
              <p className="text-section-title">Meetings today</p>
              <ul className="mt-3 space-y-2">
                {todaysMeetings.map((m) => (
                  <li key={m.id} className="rounded-lg border border-border bg-card px-4 py-3">
                    <p className="text-sm font-medium">
                      {(m.prospects as unknown as ClientRef)?.business_name ?? "Unknown lead"}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{new Date(m.scheduled_start).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                      {m.join_url && (
                        <a href={m.join_url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">
                          Join
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <p className="text-section-title">AI activity</p>
              <Link href="/admin/ai-activity" className="flex items-center gap-0.5 text-xs text-accent hover:underline">
                View all <ArrowRight className="size-3" />
              </Link>
            </div>
            {aiActivity.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nothing yet — AI activity shows up here as it happens.</p>
            ) : (
              <ul className="mt-3 space-y-1 border-l border-border pl-3">
                {aiActivity.map((entry) => {
                  const href = aiActivityHref(entry);
                  const body = (
                    <>
                      <p className="flex items-start gap-1.5 text-sm">
                        <Sparkles className="mt-0.5 size-3 shrink-0 text-[var(--gradient-violet)]" />
                        <span className={href ? "group-hover:text-accent" : ""}>
                          {describeAiActivity(entry.action, entry.metadata ?? {})}
                        </span>
                      </p>
                      <p className="mt-0.5 pl-[18px] text-xs text-muted-foreground">{timeAgo(entry.created_at)}</p>
                    </>
                  );
                  return (
                    <li key={entry.id} className="feed-item-enter">
                      {href ? (
                        <Link href={href} className="group block py-1.5">
                          {body}
                        </Link>
                      ) : (
                        <div className="py-1.5">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
