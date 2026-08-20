import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Search,
  Users,
  CreditCard,
  CheckCircle2,
  Circle,
  Lightbulb,
  ArrowRight,
  Mail,
  TrendingUp,
  Sparkles,
  Send,
  BellRing,
  Inbox,
  PoundSterling,
  Activity,
  AlertTriangle,
  FolderClock,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getStudioBriefing } from "@/lib/studio-briefing";
import { computeAgencyHealth } from "@/lib/client-health";
import { getStudioAnalytics } from "@/lib/studio-analytics";
import { generateInsights, type InsightCategory } from "@/lib/studio-insights";
import { resolveLayout, CHART_METRIC_LABELS, type StatCardId } from "@/lib/command-centre-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/eyebrow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/platform/help-tip";
import { AnalyticsChart } from "@/components/platform/analytics-chart";

const INSIGHT_ICON: Record<InsightCategory, typeof Sparkles> = {
  opportunity: Sparkles,
  warning: TriangleAlert,
  recommendation: Lightbulb,
  anomaly: Zap,
};
const INSIGHT_COLOR: Record<InsightCategory, string> = {
  opportunity: "text-accent",
  warning: "text-destructive",
  recommendation: "text-accent",
  anomaly: "text-warning",
};

// Pulled out of the component body, same reasoning as clients/page.tsx's
// thirtyDaysAgoIso() — react-hooks/purity flags a current-time read
// called directly during a component's own render, even a Server
// Component's. A coarse UK-hours greeting, not a per-viewer-timezone one
// — every real tenant so far is a UK business, and the gap between server
// time and Europe/London is at most an hour, not worth the complexity of
// a client-side clock for a "good morning" line.
function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Command Centre (Phase 1 of the Studio Command Centre plan) — the end of
// the onboarding journey, reframed around "what do I need to know and do
// right now" rather than a static welcome screen. Business Health,
// Actions Required, and the briefing all read real platform data; nothing
// here is fabricated or illustrative.
export default async function StudioHomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  const { data: org } = await supabase
    .from("organisations")
    .select("name, plan, prospecting_config, is_internal, stripe_connect_charges_enabled, command_centre_layout")
    .eq("id", membership.orgId)
    .single();
  const blocks = resolveLayout(org?.command_centre_layout);

  const config = (org?.prospecting_config ?? {}) as { agencyType?: string; services?: string[] };
  const briefing = await getStudioBriefing(supabase, membership.orgId);
  const hasBriefingContent = briefing.newThisWeek > 0 || briefing.needsResearch > 0 || briefing.readyToContact > 0;

  const [{ count: prospectCount }, { data: clients }, { data: activeDeals }, { count: emailConnectionCount }] = await Promise.all([
    supabase.from("prospects").select("id", { count: "exact", head: true }).eq("org_id", membership.orgId),
    supabase.from("clients").select("id").eq("org_id", membership.orgId),
    // Pipeline value — a tenant's own optional estimate per prospect
    // (deal_value_pence, schema-prospect-pipeline.sql), summed client-side
    // over anything still active (not yet won or lost). Never AI-estimated,
    // same reasoning as updateProspectDealValue()'s own comment.
    supabase
      .from("prospects")
      .select("deal_value_pence")
      .eq("org_id", membership.orgId)
      .not("status", "in", "(converted,lost)")
      .not("deal_value_pence", "is", null),
    supabase.from("email_connections").select("id", { count: "exact", head: true }).eq("org_id", membership.orgId),
  ]);
  const clientCount = clients?.length ?? 0;
  const clientIds = (clients ?? []).map((c) => c.id);

  // Business Health + Actions Required both need real rows (not just
  // counts) across every client — same shape of query clients/page.tsx
  // already runs per-client, just aggregated across the whole org here.
  const [{ data: requests }, { data: invoices }, { data: siteChecks }, { data: projects }] = clientIds.length
    ? await Promise.all([
        supabase.from("requests").select("id, client_id, status, responded_at").in("client_id", clientIds),
        supabase.from("invoices").select("status, due_date, paid_at").in("client_id", clientIds),
        supabase.from("site_checks").select("uptime_ok").in("client_id", clientIds),
        supabase.from("projects").select("status, target_date").in("client_id", clientIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: []}];

  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: tasks } = requestIds.length
    ? await supabase.from("tasks").select("id, request_id, status").in("request_id", requestIds)
    : { data: [] };

  const openRequestCount = (requests ?? []).filter((r) => !r.responded_at).length;
  const conversionRate = prospectCount && prospectCount > 0 ? `${Math.round((clientCount / prospectCount) * 100)}%` : "—";
  const pipelineValuePence = (activeDeals ?? []).reduce((sum, p) => sum + (p.deal_value_pence ?? 0), 0);

  const agencyHealth = computeAgencyHealth({
    requests: requests ?? [],
    tasks: tasks ?? [],
    invoices: invoices ?? [],
    siteChecks: siteChecks ?? [],
    prospectCount: prospectCount ?? 0,
    clientCount,
  });

  const today = todayIso();
  const overdueProjectCount = (projects ?? []).filter((p) => p.status === "active" && p.target_date && p.target_date < today).length;

  // Actions Required (Command Centre Phase 1) — the genuinely urgent
  // subset of what used to be scattered across the checklist, the
  // briefing, and the Requests page's own count, gathered in one place.
  // Only real, only shown when non-zero — no "0 actions required" noise.
  const actionsRequired = [
    { count: briefing.followUpsDue, label: "follow-up", href: "/studio/prospects", icon: BellRing },
    { count: overdueProjectCount, label: "overdue project", href: "/studio/projects", icon: FolderClock },
    { count: openRequestCount, label: "request awaiting your reply", href: "/studio/requests", icon: Inbox },
  ].filter((a) => a.count > 0);

  // AI Insight Feed (Command Centre Phase 3) — rule-based, not
  // LLM-generated (see studio-insights.ts's own comment on why). Reuses
  // the same 30-day analytics computation the Analytics page itself
  // shows, so an insight's numbers are never out of step with what a
  // tenant sees if they click through to investigate it.
  const analytics = await getStudioAnalytics(supabase, membership.orgId, "30d");
  const insights = generateInsights(analytics, agencyHealth, overdueProjectCount);

  // Onboarding checklist (P1 platform readiness item) — four real,
  // independently checkable states, not a fixed "step 1 of 5" wizard
  // that could drift out of sync with what's actually true. Only shown
  // while incomplete: a permanently-visible "you're all set up" card
  // past this point would just be clutter on every future visit.
  const stripeReady = Boolean(org?.is_internal || org?.stripe_connect_charges_enabled);
  const checklist = [
    { label: "Run your first discovery search", done: (prospectCount ?? 0) > 0, href: "/studio/prospects" },
    { label: "Connect your inbox for reply detection", done: (emailConnectionCount ?? 0) > 0, href: "/studio/settings" },
    { label: "Convert your first prospect into a client", done: clientCount > 0, href: "/studio/prospects" },
    { label: "Connect Stripe to invoice clients", done: stripeReady, href: "/studio/settings" },
  ];
  const checklistComplete = checklist.every((item) => item.done);

  // Command Centre Phase 5b/5c — which blocks render, their order, and
  // (for stat cards) their width is now per-org (Settings → Command
  // Centre layout), not fixed. Keyed by the same StatCardId the settings
  // panel and resolveLayout() share, so there's one real list, not two.
  const statContent: Record<StatCardId, ReactNode> = {
    health: (
      <Card className="h-full">
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Activity className="size-4.5" />
            </span>
            <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              Business Health
              <HelpTip explanation="An average of real, measured components across your whole client roster — site uptime, on-time payment, work completed, requests moving, and pipeline conversion. Only components with real data are included." />
            </p>
          </div>
          {agencyHealth.healthScore === null ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Not enough data yet — this fills in once you have clients with real requests, invoices, or projects.
            </p>
          ) : (
            <>
              <p className="mt-2 font-heading text-3xl font-semibold tabular-nums">
                {agencyHealth.healthScore}
                <span className="text-lg text-muted-foreground">/100</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {agencyHealth.components.map((c) => (
                  <span key={c.label} className="font-mono text-[10px] text-muted-foreground">
                    {c.label} <span className="text-foreground">{c.value}%</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    ),
    prospects: (
      <Card className="h-full">
        <CardContent className="flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Search className="size-5" />
          </span>
          <div>
            <p className="font-heading text-2xl font-semibold tabular-nums">{prospectCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Prospects found</p>
          </div>
        </CardContent>
      </Card>
    ),
    clients: (
      <Card className="h-full">
        <CardContent className="flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Users className="size-5" />
          </span>
          <div>
            <p className="font-heading text-2xl font-semibold tabular-nums">{clientCount}</p>
            <p className="text-xs text-muted-foreground">Clients</p>
          </div>
        </CardContent>
      </Card>
    ),
    conversion: (
      <Card className="h-full">
        <CardContent className="flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <TrendingUp className="size-5" />
          </span>
          <div>
            <p className="font-heading text-2xl font-semibold tabular-nums">{conversionRate}</p>
            <p className="text-xs text-muted-foreground">Conversion rate</p>
          </div>
        </CardContent>
      </Card>
    ),
    pipeline: (
      <Card className="h-full">
        <CardContent className="flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <PoundSterling className="size-5" />
          </span>
          <div>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {pipelineValuePence > 0 ? `£${Math.round(pipelineValuePence / 100).toLocaleString("en-GB")}` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Pipeline value</p>
          </div>
        </CardContent>
      </Card>
    ),
  };

  // Section blocks (Actions required / Insights / Your briefing) —
  // content is null when there's nothing real to show, same "only
  // render with real content" rule Phase 1/3 already established. A
  // block present in the saved layout but with no real content right
  // now simply renders nothing for that slot, rather than an empty card.
  const sectionContent: Partial<Record<"actions_required" | "insights" | "briefing", ReactNode>> = {
    actions_required:
      actionsRequired.length > 0 ? (
        <Card className="border-destructive/30">
          <CardContent>
            <p className="flex items-center gap-1.5 font-heading text-sm font-semibold">
              <AlertTriangle className="size-4 shrink-0 text-destructive" /> Actions required
              <HelpTip explanation="Real items pulled together from three places — prospects due a follow-up, projects past their target date, and client requests you haven't replied to yet. Only shown when something's actually due." />
            </p>
            <ul className="mt-3 space-y-2">
              {actionsRequired.map((a) => (
                <li key={a.label}>
                  <Link href={a.href} className="flex items-center gap-2 text-sm hover:text-accent">
                    <a.icon className="size-4 shrink-0 text-destructive" />
                    <span className="font-mono font-semibold text-destructive">{a.count}</span>
                    <span className="text-muted-foreground">
                      {a.label}
                      {a.count === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : undefined,
    insights:
      insights.length > 0 ? (
        <Card>
          <CardContent>
            <p className="flex items-center gap-1 font-heading text-sm font-semibold">
              Insights
              <HelpTip explanation="AI-generated observations based on your latest platform data — real deltas and thresholds, never invented patterns. Each one shows the exact numbers behind it." />
            </p>
            <div className="mt-3 space-y-3">
              {insights.map((insight) => {
                const Icon = INSIGHT_ICON[insight.category];
                return (
                  <div key={insight.id} className="flex items-start gap-2.5">
                    <Icon className={`mt-0.5 size-4 shrink-0 ${INSIGHT_COLOR[insight.category]}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{insight.headline}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{insight.evidence}</p>
                      {insight.action && (
                        <Link href={insight.action.href} className="mt-1 inline-block text-xs text-accent underline underline-offset-2">
                          {insight.action.label}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : undefined,
    briefing: hasBriefingContent ? (
      <Card>
        <CardContent>
          <p className="font-heading text-sm font-semibold">Your briefing</p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {briefing.newThisWeek > 0 && (
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 shrink-0 text-accent" />
                <span className="font-mono font-semibold text-accent">{briefing.newThisWeek}</span>
                <span className="text-muted-foreground">new this week</span>
              </span>
            )}
            {briefing.needsResearch > 0 && (
              <span className="flex items-center gap-1.5">
                <Search className="size-3.5 shrink-0 text-accent" />
                <span className="font-mono font-semibold text-accent">{briefing.needsResearch}</span>
                <span className="text-muted-foreground">still need research</span>
              </span>
            )}
            {briefing.readyToContact > 0 && (
              <span className="flex items-center gap-1.5">
                <Send className="size-3.5 shrink-0 text-accent" />
                <span className="font-mono font-semibold text-accent">{briefing.readyToContact}</span>
                <span className="text-muted-foreground">ready to contact</span>
              </span>
            )}
          </div>
          {briefing.topOpportunity && (
            <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                <Lightbulb className="size-3.5 shrink-0" />
                Your best opportunity right now
              </p>
              <p className="mt-1 text-sm font-medium">
                {briefing.topOpportunity.businessName}{" "}
                <span className="font-mono text-xs font-normal text-muted-foreground">({briefing.topOpportunity.overallScore}/5)</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{briefing.topOpportunity.pursueBecause}</p>
            </div>
          )}
          <Button variant="link" size="sm" className="mt-3 h-auto px-0" render={<Link href="/studio/prospects" />}>
            View all prospects
            <ArrowRight className="size-3.5" />
          </Button>
        </CardContent>
      </Card>
    ) : undefined,
  };

  return (
    <div>
      <Eyebrow>Command Centre</Eyebrow>
      <h1 className="mt-3 font-heading text-2xl font-semibold md:text-3xl">
        {timeOfDayGreeting()}, {org?.name ?? "your agency"}.
      </h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Find prospects, convert them into clients, and manage your subscription — all from here.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Badge variant="secondary">{config.agencyType ?? "Agency"}</Badge>
        <Badge variant="secondary" className="capitalize">{org?.plan ?? "starter"} plan</Badge>
      </div>

      {/* Block canvas (Command Centre Phase 5b/5c — see Settings →
          Command Centre layout). Stat cards, the three section cards
          (Actions required / Insights / Your briefing), and — since
          Phase 5c — chart/text/call-to-action blocks all live in one
          reorderable grid: a stat/chart/text/cta block occupies 1 or 2
          of 5 columns depending on its saved width, a section block
          always spans the full row (see command-centre-layout.ts's own
          comment on why), and a section block with no real content
          right now renders nothing for its slot rather than an empty
          card. Chart blocks read from the same 30-day analytics already
          fetched for Insights above — never a second query. */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {blocks.map((block) => {
          if (block.type === "stat") {
            return (
              <div key={block.id} className={block.span === 2 ? "sm:col-span-2" : undefined}>
                {statContent[block.cardId]}
              </div>
            );
          }
          if (block.type === "actions_required" || block.type === "insights" || block.type === "briefing") {
            const content = sectionContent[block.type];
            if (!content) return null;
            return (
              <div key={block.id} className="sm:col-span-2 lg:col-span-5">
                {content}
              </div>
            );
          }
          if (block.type === "chart") {
            const series = block.metric === "revenue" ? analytics.revenueSeries : analytics.prospectsSeries;
            return (
              <div key={block.id} className={block.span === 2 ? "sm:col-span-2" : undefined}>
                <Card className="h-full">
                  <CardContent>
                    <p className="text-sm font-semibold">{CHART_METRIC_LABELS[block.metric]} over time</p>
                    <AnalyticsChart
                      series={series}
                      kind={block.kind}
                      format={block.metric === "revenue" ? "money" : "count"}
                      height={180}
                      emptyMessage="No data in this period yet."
                    />
                  </CardContent>
                </Card>
              </div>
            );
          }
          if (block.type === "text") {
            return (
              <div key={block.id} className={block.span === 2 ? "sm:col-span-2" : undefined}>
                <Card className="h-full">
                  <CardContent>
                    <p className="font-heading text-sm font-semibold">{block.title}</p>
                    <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{block.body}</p>
                  </CardContent>
                </Card>
              </div>
            );
          }
          // cta — an external https link (isSafeHref() in command-centre-
          // layout.ts already rejected anything else) opens in a new tab
          // with rel="noopener noreferrer"; an internal path uses Next's
          // own Link like every other in-app link on this page.
          const isExternal = block.href.startsWith("https://");
          const ctaClassName =
            "flex h-full items-center justify-center rounded-xl border border-accent/40 bg-accent/5 p-4 text-center font-heading text-sm font-semibold text-accent transition-colors hover:bg-accent/10";
          return (
            <div key={block.id} className={block.span === 2 ? "sm:col-span-2" : undefined}>
              {isExternal ? (
                <a href={block.href} target="_blank" rel="noopener noreferrer" className={ctaClassName}>
                  {block.label}
                </a>
              ) : (
                <Link href={block.href} className={ctaClassName}>
                  {block.label}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Getting set up (P1 onboarding checklist) — deliberately not a
          block: it's a temporary, self-removing section (see its own
          comment below), not a permanent piece of the layout an agency
          would want to reorder or hide. Always renders directly after
          the block canvas while incomplete. */}
      {!checklistComplete && (
        <Card className="mt-6">
          <CardContent>
            <p className="font-heading text-sm font-semibold">Getting set up</p>
            <ul className="mt-3 space-y-2">
              {checklist.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 text-sm ${item.done ? "text-muted-foreground" : "text-foreground hover:text-accent"}`}
                  >
                    {item.done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-accent" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className={item.done ? "line-through" : ""}>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {config.services && config.services.length > 0 && (
        <Card className="mt-6">
          <CardContent>
            <p className="font-heading text-sm font-semibold">What you&apos;re set up to sell</p>
            <ul className="mt-3 space-y-2 text-sm">
              {config.services.map((service) => (
                <li key={service} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="size-3.5 shrink-0 text-accent" />
                  {service}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Link href="/studio/prospects" className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-center transition-colors hover:bg-accent/10">
          <Search className="mx-auto size-5 text-accent" />
          <p className="mt-2 font-heading text-sm font-semibold">Prospecting</p>
          <p className="mt-1 font-mono text-[11px] tracking-wide text-accent uppercase">Ready</p>
        </Link>
        <Link href="/studio/clients" className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-center transition-colors hover:bg-accent/10">
          <Users className="mx-auto size-5 text-accent" />
          <p className="mt-2 font-heading text-sm font-semibold">Client management</p>
          <p className="mt-1 font-mono text-[11px] tracking-wide text-accent uppercase">Ready</p>
        </Link>
        <Link href="/studio/requests" className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-center transition-colors hover:bg-accent/10">
          <Inbox className="mx-auto size-5 text-accent" />
          <p className="mt-2 font-heading text-sm font-semibold">Requests</p>
          <p className="mt-1 font-mono text-[11px] tracking-wide text-accent uppercase">Ready</p>
        </Link>
        <Link href="/studio/billing" className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-center transition-colors hover:bg-accent/10">
          <CreditCard className="mx-auto size-5 text-accent" />
          <p className="mt-2 font-heading text-sm font-semibold">Billing</p>
          <p className="mt-1 font-mono text-[11px] tracking-wide text-accent uppercase">Ready</p>
        </Link>
        <Link href="/studio/settings" className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-center transition-colors hover:bg-accent/10">
          <Mail className="mx-auto size-5 text-accent" />
          <p className="mt-2 font-heading text-sm font-semibold">Integrations</p>
          <p className="mt-1 font-mono text-[11px] tracking-wide text-accent uppercase">Ready</p>
        </Link>
      </div>
    </div>
  );
}
