import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Search,
  Users,
  CheckCircle2,
  Circle,
  Lightbulb,
  ArrowRight,
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
  ListChecks,
  ShieldAlert,
  Cpu,
  Bot,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getOrgMembership } from "@/lib/org-membership";
import { getStudioBriefing } from "@/lib/studio-briefing";
import { computeAgencyHealth } from "@/lib/client-health";
import { getStudioAnalytics } from "@/lib/studio-analytics";
import { generateInsights, type InsightCategory } from "@/lib/studio-insights";
import { computeClientEngagementRisk } from "@/lib/studio-engagement";
import { getModelPerformance } from "@/lib/studio-model-performance";
import { computeClientAiAdoption } from "@/lib/studio-ai-adoption";
import { resolveLayout, CHART_METRIC_LABELS, type StatCardId } from "@/lib/command-centre-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/eyebrow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/platform/help-tip";
import { AnalyticsChart } from "@/components/platform/analytics-chart";
import { HealthRing } from "@/components/analytics/health-ring";
import { CountUp } from "@/components/platform/count-up";
import { TodayStrip, type TodayStat } from "@/components/platform/today-strip";
import { Reveal } from "@/components/reveal";

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
const INSIGHT_BORDER: Record<InsightCategory, string> = {
  opportunity: "border-accent/40",
  warning: "border-destructive/40",
  recommendation: "border-accent/40",
  anomaly: "border-warning/40",
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

// Same react-hooks/purity reasoning as todayIso() above — a bare `new
// Date()` in the component body itself is what the lint rule flags, not
// one wrapped in a named function. computeClientEngagementRisk() (Phase
// 6c) needs the real Date, not just todayIso()'s date-only string.
function nowDate(): Date {
  return new Date();
}

// The Command Centre's old subtext was the same generic sentence for
// every org, every day: "Find prospects, convert them into clients, and
// manage your subscription — all from here." Replaced with one real
// signal, picked in priority order from numbers this page already
// computes — never a second data source, never invented. Falls through
// to a calm, honest line rather than a forced "everything's amazing"
// when there's genuinely nothing urgent to report.
function pickHeadlineSignal(params: {
  actionsTotal: number;
  readyToContact: number;
  pipelineValuePence: number;
}): string {
  const { actionsTotal, readyToContact, pipelineValuePence } = params;
  if (actionsTotal > 0) {
    return `You have ${actionsTotal} thing${actionsTotal === 1 ? "" : "s"} that need${actionsTotal === 1 ? "s" : ""} your attention today.`;
  }
  if (readyToContact > 0) {
    return `${readyToContact} prospect${readyToContact === 1 ? " is" : "s are"} ready to contact whenever you are.`;
  }
  if (pipelineValuePence > 0) {
    return `£${Math.round(pipelineValuePence / 100).toLocaleString("en-GB")} sitting in your pipeline right now.`;
  }
  return "Everything's running smoothly — here's where things stand.";
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
    // business_name added for Engagement Risk (Phase 6c); chatbot_embed_enabled
    // added for Client AI Adoption (Phase 6d) — every other column here
    // was already only "id" because nothing before that needed either.
    supabase.from("clients").select("id, business_name, chatbot_embed_enabled").eq("org_id", membership.orgId),
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
  // created_at (requests) and client_id (invoices) are added for
  // Engagement Risk (Phase 6c) — the same two queries, computeAgencyHealth
  // just never needed either column before.
  const [{ data: requests }, { data: invoices }, { data: siteChecks }, { data: projects }] = clientIds.length
    ? await Promise.all([
        supabase.from("requests").select("id, client_id, status, responded_at, created_at").in("client_id", clientIds),
        supabase.from("invoices").select("client_id, status, due_date, paid_at").in("client_id", clientIds),
        supabase.from("site_checks").select("uptime_ok").in("client_id", clientIds),
        supabase.from("projects").select("status, target_date").in("client_id", clientIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: []}];

  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: tasks } = requestIds.length
    ? await supabase.from("tasks").select("id, request_id, status").in("request_id", requestIds)
    : { data: [] };

  const openRequestCount = (requests ?? []).filter((r) => !r.responded_at).length;
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

  // Engagement Risk (Command Centre Phase 6c) — clients who've gone quiet
  // and/or fallen behind on an invoice, off the same requests/invoices
  // rows already fetched above. See studio-engagement.ts's own comment
  // for why this reuses real contact/payment dates instead of the
  // portal-login tracking the original concept assumed would be needed.
  const engagementRisks = computeClientEngagementRisk(clients ?? [], requests ?? [], invoices ?? [], nowDate());

  // Model Performance + Client AI Adoption (Command Centre Phase 6d).
  // ai_call_log (schema-ai-call-log.sql) is service-role-only, same
  // convention as usage_events — no session-facing read path, so this
  // reads through the admin client like usage-limits.ts already does,
  // not the session-scoped `supabase` this page uses everywhere else.
  const admin = getSupabaseAdmin();
  const modelPerformance = admin
    ? await getModelPerformance(admin, membership.orgId)
    : { callCount: 0, successRatePct: null, medianLatencyMs: null, estimatedCostUsd: null };
  const aiAdoption = computeClientAiAdoption(clients ?? []);

  // Actions Required (Command Centre Phase 1) — the genuinely urgent
  // subset of what used to be scattered across the checklist, the
  // briefing, and the Requests page's own count, gathered in one place.
  // Only real, only shown when non-zero — no "0 actions required" noise.
  const actionsRequired = [
    { count: briefing.followUpsDue, label: "follow-up", href: "/studio/prospects", icon: BellRing },
    { count: overdueProjectCount, label: "overdue project", href: "/studio/projects", icon: FolderClock },
    { count: openRequestCount, label: "request awaiting your reply", href: "/studio/requests", icon: Inbox },
  ].filter((a) => a.count > 0);
  const actionsTotal = actionsRequired.reduce((sum, a) => sum + a.count, 0);

  // AI Insight Feed (Command Centre Phase 3) — rule-based, not
  // LLM-generated (see studio-insights.ts's own comment on why). Reuses
  // the same 30-day analytics computation the Analytics page itself
  // shows, so an insight's numbers are never out of step with what a
  // tenant sees if they click through to investigate it.
  const analytics = await getStudioAnalytics(supabase, membership.orgId, "30d");
  const insights = generateInsights(analytics, agencyHealth, overdueProjectCount);

  // TODAY masthead (see today-strip.tsx's own comment) — every value
  // here is one already computed above for the briefing/actions-required
  // sections, just surfaced first and more prominently.
  // Short enough to actually fit one of four columns without truncating
  // mid-word — "New prospects this week" etc. were being cut to "New
  // prospects this w…" at real column widths. "This week"/"today" is
  // redundant anyway once it's sitting under a section literally
  // labelled TODAY.
  const todayStats: TodayStat[] = [
    { id: "new", value: briefing.newThisWeek, label: "New prospects", icon: Sparkles },
    { id: "requests", value: openRequestCount, label: "Needs a reply", icon: Inbox, tone: openRequestCount > 0 ? "urgent" : "default" },
    { id: "pipeline", value: Math.round(pipelineValuePence / 100), label: "Pipeline", icon: PoundSterling, prefix: "£" },
    { id: "actions", value: actionsTotal, label: "To do", icon: ListChecks, tone: actionsTotal > 0 ? "urgent" : "default" },
  ];

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
    // The one dark surface on an otherwise light page — reserved for
    // this specifically, the same "one considered contrast moment, not a
    // whole dark UI" call the marketing/signup redesigns already made
    // (signup-brand-panel.tsx). HealthRing (analytics/health-ring.tsx)
    // already exists and is already built for exactly this dark-card
    // context (its center label uses text-primary-foreground) — reused
    // here rather than a second ring implementation, same component the
    // hero product panel and client detail pages already use.
    // Every stat card is now this same dark language, not just Business
    // Health — direct instruction to replicate that card's style across
    // the whole page rather than keep it as the one dark exception.
    // Header row is consistently icon+label (left) / HelpTip (right) via
    // justify-between — the previous version packed HelpTip directly
    // after the label with no room to breathe, which is the real reason
    // the whole card read as cramped, not just the stat list below it.
    health: (
      <Card className="h-full overflow-hidden border-none bg-primary text-primary-foreground">
        <CardContent className="flex h-full flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground/70">
              <Activity className="size-3.5 shrink-0" />
              Business Health
            </p>
            <HelpTip explanation="An average of real, measured components across your whole client roster — site uptime, on-time payment, work completed, requests moving, and pipeline conversion. Only components with real data are included." />
          </div>
          {agencyHealth.healthScore === null ? (
            <p className="mt-4 flex-1 text-sm text-primary-foreground/60">
              Not enough data yet — this fills in once you have clients with real requests, invoices, or projects.
            </p>
          ) : (
            // Ring above the breakdown, not beside it — this card is a
            // single-width column now, same as every other stat card
            // (see the grid's own comment on why), and a ring wide
            // enough to read well plus a label column beside it doesn't
            // fit that width. Each driver row is its own label/value
            // pair, label free to wrap onto two lines if it needs to
            // (it has the card's full width now, not a squeezed
            // remainder next to a ring) rather than clipping — the
            // actual bug the last version of this layout had, not the
            // width itself.
            <div className="mt-4 flex flex-1 flex-col items-center gap-3">
              <HealthRing score={agencyHealth.healthScore} size={64} strokeWidth={6} centerLabel={String(agencyHealth.healthScore)} />
              <div className="flex w-full flex-col gap-2">
                {agencyHealth.components.map((c) => (
                  <div key={c.label} className="flex items-start justify-between gap-2 border-t border-white/10 pt-2 first:border-t-0 first:pt-0">
                    <p className="text-[11px] leading-tight text-primary-foreground/50">{c.label}</p>
                    <p className="shrink-0 text-xs leading-none font-semibold text-primary-foreground">{c.value}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    ),
    prospects: (
      <Card className="h-full border-none bg-primary text-primary-foreground">
        <CardContent className="flex items-center gap-3.5 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Search className="size-5" />
          </span>
          <div>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              <CountUp value={prospectCount ?? 0} />
            </p>
            <p className="text-xs text-primary-foreground/60">Prospects found</p>
          </div>
        </CardContent>
      </Card>
    ),
    clients: (
      <Card className="h-full border-none bg-primary text-primary-foreground">
        <CardContent className="flex items-center gap-3.5 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Users className="size-5" />
          </span>
          <div>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              <CountUp value={clientCount} />
            </p>
            <p className="text-xs text-primary-foreground/60">Clients</p>
          </div>
        </CardContent>
      </Card>
    ),
    conversion: (
      <Card className="h-full border-none bg-primary text-primary-foreground">
        <CardContent className="flex items-center gap-3.5 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <TrendingUp className="size-5" />
          </span>
          <div>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {prospectCount && prospectCount > 0 ? <CountUp value={Math.round((clientCount / prospectCount) * 100)} suffix="%" /> : "—"}
            </p>
            <p className="text-xs text-primary-foreground/60">Conversion rate</p>
          </div>
        </CardContent>
      </Card>
    ),
    pipeline: (
      <Card className="h-full border-none bg-primary text-primary-foreground">
        <CardContent className="flex items-center gap-3.5 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <PoundSterling className="size-5" />
          </span>
          <div>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {pipelineValuePence > 0 ? <CountUp value={Math.round(pipelineValuePence / 100)} prefix="£" /> : "—"}
            </p>
            <p className="text-xs text-primary-foreground/60">Pipeline value</p>
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
  const sectionContent: Partial<
    Record<"actions_required" | "insights" | "briefing" | "engagement_risk" | "model_performance" | "client_ai_adoption", ReactNode>
  > = {
    actions_required:
      actionsRequired.length > 0 ? (
        <Card className="border-none bg-primary text-primary-foreground">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground/70">
                <AlertTriangle className="size-3.5 shrink-0 text-destructive" /> Your next best actions
              </p>
              <HelpTip explanation="Real items pulled together from three places — prospects due a follow-up, projects past their target date, and client requests you haven't replied to yet. Only shown when something's actually due." />
            </div>
            <ol className="mt-4 space-y-3">
              {actionsRequired.map((a, i) => (
                <li key={a.label}>
                  <Link href={a.href} className="group flex items-center gap-3 text-sm">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/15 font-mono text-[11px] font-semibold text-destructive">
                      {i + 1}
                    </span>
                    <a.icon className="size-4 shrink-0 text-destructive" />
                    <span className="text-primary-foreground/70 group-hover:text-primary-foreground">
                      <span className="font-mono font-semibold text-primary-foreground">{a.count}</span>{" "}
                      {a.label}
                      {a.count === 1 ? "" : "s"}
                    </span>
                    <ArrowRight className="ml-auto size-3.5 shrink-0 text-primary-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : undefined,
    insights:
      insights.length > 0 ? (
        <Card className="border-none bg-primary text-primary-foreground">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-primary-foreground/70">Insights</p>
              <HelpTip explanation="AI-generated observations based on your latest platform data — real deltas and thresholds, never invented patterns. Each one shows the exact numbers behind it." />
            </div>
            <div className="mt-4 space-y-3">
              {insights.map((insight) => {
                const Icon = INSIGHT_ICON[insight.category];
                return (
                  <div key={insight.id} className={`flex items-start gap-3 rounded-lg border-l-2 bg-white/[0.03] py-2 pr-2 pl-3 ${INSIGHT_BORDER[insight.category]}`}>
                    <Icon className={`mt-0.5 size-4 shrink-0 ${INSIGHT_COLOR[insight.category]}`} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-primary-foreground">
                        {insight.headline}
                        {insight.impact === "high" && (
                          <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-primary-foreground/70 uppercase">
                            Priority
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-primary-foreground/50">{insight.evidence}</p>
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
      <Card className="border-none bg-primary text-primary-foreground">
        <CardContent className="p-5">
          <p className="text-xs font-semibold text-primary-foreground/70">Your briefing</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {briefing.newThisWeek > 0 && (
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 shrink-0 text-accent" />
                <span className="font-mono font-semibold text-accent">{briefing.newThisWeek}</span>
                <span className="text-primary-foreground/60">new this week</span>
              </span>
            )}
            {briefing.needsResearch > 0 && (
              <span className="flex items-center gap-1.5">
                <Search className="size-3.5 shrink-0 text-accent" />
                <span className="font-mono font-semibold text-accent">{briefing.needsResearch}</span>
                <span className="text-primary-foreground/60">still need research</span>
              </span>
            )}
            {briefing.readyToContact > 0 && (
              <span className="flex items-center gap-1.5">
                <Send className="size-3.5 shrink-0 text-accent" />
                <span className="font-mono font-semibold text-accent">{briefing.readyToContact}</span>
                <span className="text-primary-foreground/60">ready to contact</span>
              </span>
            )}
          </div>
          {briefing.topOpportunity && (
            <div className="mt-4 rounded-lg border border-accent/25 bg-accent/10 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                <Lightbulb className="size-3.5 shrink-0" />
                Your best opportunity right now
              </p>
              <p className="mt-1 text-sm font-medium text-primary-foreground">
                {briefing.topOpportunity.businessName}{" "}
                <span className="font-mono text-xs font-normal text-primary-foreground/50">({briefing.topOpportunity.overallScore}/5)</span>
              </p>
              <p className="mt-1 text-sm text-primary-foreground/60">{briefing.topOpportunity.pursueBecause}</p>
            </div>
          )}
          <Button variant="link" size="sm" className="mt-3 h-auto px-0 text-accent" render={<Link href="/studio/prospects" />}>
            View all prospects
            <ArrowRight className="size-3.5" />
          </Button>
        </CardContent>
      </Card>
    ) : undefined,
    // Command Centre Phase 6c — see studio-engagement.ts's own comment on
    // what this is actually computed from (real contact/payment dates,
    // not the login tracking the original concept assumed). Each row's
    // 6 cells are a real 6-week window, oldest to newest; a filled cell
    // is a week this client actually contacted the agency.
    engagement_risk:
      engagementRisks.length > 0 ? (
        <Card className="border-none bg-primary text-primary-foreground">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground/70">
                <ShieldAlert className="size-3.5 shrink-0 text-destructive" /> Engagement risk
              </p>
              <HelpTip explanation="Clients who've gone 2+ weeks without a request, or who have an invoice past its due date — real dates, never a prediction. A client with neither signal simply isn't listed here." />
            </div>
            <ul className="mt-4 space-y-3">
              {engagementRisks.slice(0, 5).map((risk) => (
                <li key={risk.clientId} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary-foreground">{risk.businessName}</p>
                    <p className="mt-0.5 text-xs text-primary-foreground/50">
                      {risk.quietWeeks > 0 && `Quiet ${risk.quietWeeks} week${risk.quietWeeks === 1 ? "" : "s"}`}
                      {risk.quietWeeks > 0 && risk.hasOverdueInvoice && " · "}
                      {risk.hasOverdueInvoice && "Invoice overdue"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {risk.weeks.map((week, i) => (
                      <span key={i} title={week.label} className={`size-2.5 rounded-sm ${week.active ? "bg-accent/70" : "bg-white/10"}`} />
                    ))}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide uppercase ${
                      risk.tier === "critical" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
                    }`}
                  >
                    {risk.tier}
                  </span>
                </li>
              ))}
            </ul>
            {engagementRisks.length > 5 && (
              <p className="mt-3 text-xs text-primary-foreground/50">
                +{engagementRisks.length - 5} more at risk — see{" "}
                <Link href="/studio/clients" className="text-accent underline underline-offset-2">
                  Clients
                </Link>{" "}
                for the full list.
              </p>
            )}
          </CardContent>
        </Card>
      ) : undefined,
    // Command Centre Phase 6d — real success rate, latency and cost for
    // this org's own two Claude-backed features, off ai_call_log. Only
    // shown once there's at least one real call to report — same rule
    // as every other section here.
    model_performance:
      modelPerformance.callCount > 0 ? (
        <Card className="border-none bg-primary text-primary-foreground">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground/70">
                <Cpu className="size-3.5 shrink-0" /> Model performance
              </p>
              <HelpTip explanation="Real success rate, latency and estimated cost for your AI Design Assistant and AI Business Analyst calls over the last 30 days. Cost is Anthropic's published per-token rate in US dollars, not converted to £ — an invented exchange rate would be less honest than showing none." />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <p className="font-heading text-xl font-semibold tabular-nums">{modelPerformance.successRatePct}%</p>
                <p className="text-xs text-primary-foreground/50">Success rate</p>
              </div>
              <div>
                <p className="font-heading text-xl font-semibold tabular-nums">
                  {modelPerformance.medianLatencyMs !== null ? `${(modelPerformance.medianLatencyMs / 1000).toFixed(1)}s` : "—"}
                </p>
                <p className="text-xs text-primary-foreground/50">Median latency</p>
              </div>
              <div>
                <p className="font-heading text-xl font-semibold tabular-nums">
                  {modelPerformance.estimatedCostUsd !== null ? `$${modelPerformance.estimatedCostUsd.toFixed(2)}` : "—"}
                </p>
                <p className="text-xs text-primary-foreground/50">Est. cost, 30d</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-primary-foreground/40">
              {modelPerformance.callCount} call{modelPerformance.callCount === 1 ? "" : "s"} in the last 30 days
            </p>
          </CardContent>
        </Card>
      ) : undefined,
    // Command Centre Phase 6d — see studio-ai-adoption.ts's own comment
    // on why this measures "switched on," not usage volume.
    client_ai_adoption:
      aiAdoption.activeClientCount > 0 ? (
        <Card className="border-none bg-primary text-primary-foreground">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground/70">
                <Bot className="size-3.5 shrink-0" /> Client AI adoption
              </p>
              <HelpTip explanation="Share of your clients with the AI chatbot feature turned on for their own website. Measures whether it's switched on, not how much it's used — message volume isn't tracked yet." />
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <p className="font-heading text-2xl font-semibold tabular-nums">{aiAdoption.adoptionPct}%</p>
              <p className="text-sm text-primary-foreground/60">
                {aiAdoption.adoptedCount} of {aiAdoption.activeClientCount} client{aiAdoption.activeClientCount === 1 ? "" : "s"} have the AI chatbot
                enabled
              </p>
            </div>
          </CardContent>
        </Card>
      ) : undefined,
  };

  return (
    <div>
      <Eyebrow>Command Centre</Eyebrow>
      <h1 className="mt-3 font-heading text-3xl font-semibold md:text-4xl">
        {timeOfDayGreeting()}, {org?.name ?? "your agency"}.
      </h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        {pickHeadlineSignal({ actionsTotal, readyToContact: briefing.readyToContact, pipelineValuePence })}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Badge variant="secondary">{config.agencyType ?? "Agency"}</Badge>
        <Badge variant="secondary" className="capitalize">{org?.plan ?? "starter"} plan</Badge>
      </div>

      <Reveal>
        <TodayStrip stats={todayStats} />
      </Reveal>

      {/* Block canvas (Command Centre Phase 5b/5c — see Settings →
          Command Centre layout). Stat cards, the section cards (Actions
          required / Insights / Your briefing / Engagement risk / Model
          performance / Client AI adoption), and — since Phase 5c —
          chart/text/call-to-action blocks all live in one reorderable
          grid: a stat/chart/text/cta block occupies 1 or 2 of 5 columns
          depending on its saved width, a section block always spans the
          full row (see command-centre-layout.ts's own comment on why),
          and a section block with no real content right now renders
          nothing for its slot rather than an empty card. Chart blocks
          read from the same 30-day analytics already fetched for
          Insights above — never a second query.
          5 columns, every default stat card at span 1: genuinely
          uniform cards, not just close — see command-centre-layout.ts's
          own comment on why health gave up its old span-2 default.
          Default grid alignment (stretch), not items-start: with every
          default stat card the same width and the health card's own
          content now built for that width (ring above the breakdown,
          not beside it — see the health card's own comment), the height
          difference between cards is small enough that stretching every
          card in a row to match its tallest neighbour reads as "these
          are the same size," not the dead-space problem stretch caused
          when health was twice the width and had far more content. */}
      <Reveal delay={80} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {blocks.map((block) => {
          if (block.type === "stat") {
            return (
              <div key={block.id} className={block.span === 2 ? "sm:col-span-2" : undefined}>
                {statContent[block.cardId]}
              </div>
            );
          }
          if (
            block.type === "actions_required" ||
            block.type === "insights" ||
            block.type === "briefing" ||
            block.type === "engagement_risk" ||
            block.type === "model_performance" ||
            block.type === "client_ai_adoption"
          ) {
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
            const forecast = block.metric === "revenue" ? analytics.revenueForecast : undefined;
            return (
              <div key={block.id} className={block.span === 2 ? "sm:col-span-2" : undefined}>
                <Card className="h-full border-none bg-primary text-primary-foreground">
                  <CardContent className="p-5">
                    <p className="text-sm font-semibold">{CHART_METRIC_LABELS[block.metric]} over time</p>
                    <AnalyticsChart
                      series={series}
                      forecast={forecast}
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
                <Card className="h-full border-none bg-primary text-primary-foreground">
                  <CardContent className="p-5">
                    <p className="font-heading text-sm font-semibold">{block.title}</p>
                    <p className="mt-2 text-sm whitespace-pre-wrap text-primary-foreground/60">{block.body}</p>
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
      </Reveal>

      {/* Getting set up (P1 onboarding checklist) — deliberately not a
          block: it's a temporary, self-removing section (see its own
          comment below), not a permanent piece of the layout an agency
          would want to reorder or hide. Always renders directly after
          the block canvas while incomplete. */}
      {!checklistComplete && (
        <Card className="mt-6 border-none bg-primary text-primary-foreground">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-primary-foreground/70">Getting set up</p>
            <ul className="mt-4 space-y-2.5">
              {checklist.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 text-sm ${item.done ? "text-primary-foreground/40" : "text-primary-foreground/80 hover:text-primary-foreground"}`}
                  >
                    {item.done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-accent" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-primary-foreground/30" />
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
        <Card className="mt-6 border-none bg-primary text-primary-foreground">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-primary-foreground/70">What you&apos;re set up to sell</p>
            <ul className="mt-4 space-y-2 text-sm">
              {config.services.map((service) => (
                <li key={service} className="flex items-center gap-2 text-primary-foreground/70">
                  <CheckCircle2 className="size-3.5 shrink-0 text-accent" />
                  {service}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
