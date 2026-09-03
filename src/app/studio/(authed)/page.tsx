import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  Search,
  Users,
  CheckCircle2,
  Circle,
  Sparkles,
  BellRing,
  Inbox,
  PoundSterling,
  FolderClock,
  ListChecks,
  ShieldAlert,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getOrgMembership } from "@/lib/org-membership";
import { getStudioBriefing } from "@/lib/studio-briefing";
import { computeAgencyHealth } from "@/lib/client-health";
import { getStudioAnalytics, RANGE_LABELS, type AnalyticsRange, type AnalyticsData } from "@/lib/studio-analytics";
import { generateInsights } from "@/lib/studio-insights";
import { computeClientEngagementRisk } from "@/lib/studio-engagement";
import { computeRecentClientActivity } from "@/lib/studio-client-activity";
import { getModelPerformance, emptyModelPerformance } from "@/lib/studio-model-performance";
import { computeClientAiAdoption } from "@/lib/studio-ai-adoption";
import { getHealthTrend, getHealthSeries } from "@/lib/studio-health-history";
import { getAdoptionSeries } from "@/lib/studio-adoption-history";
import { resolveLayout, CHART_METRIC_LABELS, type Block } from "@/lib/command-centre-layout";
import { computeActionQueue } from "@/lib/studio-action-queue";
import {
  blockTab,
  COMMAND_CENTRE_TAB_ORDER,
  COMMAND_CENTRE_TAB_LABELS,
  type CommandCentreTabId,
} from "@/lib/command-centre-tab-grouping";
import { resolveTodayStrip, TODAY_STAT_LABELS, type TodayStatId } from "@/lib/today-strip-config";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/eyebrow";
import { Badge } from "@/components/ui/badge";
import { AnalyticsChart } from "@/components/platform/analytics-chart";
import { TodayStrip, type TodayStat } from "@/components/platform/today-strip";
import { Reveal } from "@/components/reveal";
import { CommandCentreTabs } from "@/components/platform/command-centre-tabs";
import { buildStatContent } from "@/components/platform/command-centre-stat-cards";
import { buildSectionContent } from "@/components/platform/command-centre-section-cards";

// SEO/metadata audit (2 Sep 2026) — same gap as /admin and /portal
// (found there first, see those layout.tsx files), but here it's the
// paid product itself: all 17 real pages under studio/(authed)/* had no
// metadata of their own and the shared layout provided no fallback, so
// every one of them showed the root layout's default "HamishAI Agency
// Platform..." title in the tab — indistinguishable from the marketing
// site and from each other, which matters more here than anywhere else
// on the site since a working agency genuinely keeps several of these
// tabbed open at once (Prospects, Clients, Analytics...). Unlike
// /admin and /portal, every page here is a real server component (none
// use "use client"), so each gets its own real, distinct title directly
// rather than a single shared layout-level fallback — titled "<Page> |
// Studio" to match the app's own internal name for itself (StudioSidebar,
// studio-nav.ts, StudioTour — "Studio" throughout this codebase; "HamishAI
// Agency Platform" is the formal marketing name used for the product,
// not what the in-app sidebar or its own component names call it).
export const metadata: Metadata = { title: "Command Centre | Studio" };

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

// Same react-hooks/purity reasoning, and the same window clients/page.tsx
// already uses for its own embed-chat usage query — Client AI Adoption
// (Command Centre improvement #4) reads the exact same audit_log rows.
function thirtyDaysAgoIso(): string {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
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

  // Bug fix — reported live twice: the greeting kept showing the literal
  // fallback text "your agency" instead of a tenant's real org name, even
  // though the exact same row's name renders correctly in the layout just
  // above it (layout.tsx's own query — name, tour_completed_at,
  // subscription_status, trial_ends_at, is_internal). A first attempt
  // (retrying the identical wide query on a null result) didn't fix it —
  // proof the failure is deterministic, not a transient hiccup, which
  // points at the real cause: command_centre_layout, today_strip_stats,
  // and stripe_connect_charges_enabled were all added by their own
  // separate, later "run this once in the Supabase SQL editor" migrations
  // (schema-command-centre-layout-v2.sql, schema-today-strip.sql,
  // schema-stripe-connect.sql). If even one of those three was never run
  // against this environment's actual database, PostgREST rejects the
  // *entire* select — including name and plan — as a single all-or-
  // nothing query, which exactly matches "name silently blank, nothing
  // else on the page visibly breaks."
  //
  // Split into a core query (name, plan, is_internal — the same
  // long-established columns layout.tsx's own working query already
  // proves reliable) that the greeting and plan badge depend on, and a
  // separate best-effort query for the newer optional fields. If the
  // second one fails, this page degrades to default layout/branding
  // rather than losing the org's own name along with it — and logs the
  // real error so it's visible in server logs instead of silently eaten.
  const { data: coreOrg } = await supabase.from("organisations").select("name, plan, is_internal").eq("id", membership.orgId).maybeSingle();

  const { data: extraOrg, error: extraOrgError } = await supabase
    .from("organisations")
    .select("prospecting_config, brand, stripe_connect_charges_enabled, command_centre_layout, today_strip_stats")
    .eq("id", membership.orgId)
    .maybeSingle();
  if (extraOrgError) {
    console.error(
      "Studio Command Centre: optional org fields failed to load (likely a column missing a migration — check command_centre_layout/today_strip_stats/stripe_connect_charges_enabled):",
      extraOrgError
    );
  }

  const org = { ...coreOrg, ...extraOrg };
  const blocks = resolveLayout(org?.command_centre_layout);

  const config = (org?.prospecting_config ?? {}) as { agencyType?: string; services?: string[] };

  // Real-improvement pass — briefing used to be its own sequential await
  // ahead of this batch even though it needs nothing this batch produces
  // (just supabase + orgId, same as everything else here) — a real,
  // avoidable extra round trip on every single page load, not just a
  // stylistic difference. It runs its own separate `prospects` query
  // (full rows, not this batch's plain count), so there's no read
  // conflict joining it in.
  const [briefing, { count: prospectCount }, { data: clients }, { data: activeDeals }, { count: emailConnectionCount }] = await Promise.all([
    getStudioBriefing(supabase, membership.orgId),
    supabase.from("prospects").select("id", { count: "exact", head: true }).eq("org_id", membership.orgId),
    // business_name added for Engagement Risk (Phase 6c); chatbot_embed_enabled
    // added for Client AI Adoption (Phase 6d); created_at added for
    // Recent activity (improvement #8) — every other column here was
    // already only "id" because nothing before that needed either.
    supabase.from("clients").select("id, business_name, chatbot_embed_enabled, created_at").eq("org_id", membership.orgId),
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
  const hasBriefingContent = briefing.newThisWeek > 0 || briefing.needsResearch > 0 || briefing.readyToContact > 0;
  const clientCount = clients?.length ?? 0;
  const clientIds = (clients ?? []).map((c) => c.id);

  // Business Health + Actions Required both need real rows (not just
  // counts) across every client — same shape of query clients/page.tsx
  // already runs per-client, just aggregated across the whole org here.
  // created_at (requests) and client_id (invoices) are added for
  // Engagement Risk (Phase 6c) — the same two queries, computeAgencyHealth
  // just never needed either column before.
  // embedChatEvents (Command Centre improvement #4) — same audit_log
  // query, same "embed_chat.message" action and 30-day window, as the
  // Clients page's own per-client usage line (Phase 4 usage visibility).
  // RLS (audit_log_select_embed_chat_own_org, schema-rls-audit-log-embed-
  // chat.sql) scopes this to just this one event type, same as there.
  // raw_text (requests), amount_pence/description (invoices), id/name
  // (projects) added for Recent activity (improvement #8) —
  // computeRecentClientActivity() needs real content for each feed row,
  // not just the dates the other sections already used these queries for.
  const [{ data: requests }, { data: invoices }, { data: siteChecks }, { data: projects }, { data: embedChatEvents }] = clientIds.length
    ? await Promise.all([
        supabase.from("requests").select("id, client_id, status, responded_at, created_at, raw_text").in("client_id", clientIds),
        // reminder_sent_at added for Engagement Risk's "Send payment
        // reminder" action (studio-engagement.ts) — id was already
        // selected, this is the one extra column needed to know whether a
        // reminder has already gone out for the overdue invoice being
        // surfaced, zero new query.
        supabase
          .from("invoices")
          .select("id, client_id, status, due_date, paid_at, amount_pence, description, reminder_sent_at")
          .in("client_id", clientIds),
        supabase.from("site_checks").select("uptime_ok").in("client_id", clientIds),
        supabase.from("projects").select("id, client_id, name, status, target_date, created_at").in("client_id", clientIds),
        supabase
          .from("audit_log")
          .select("client_id")
          .eq("action", "embed_chat.message")
          .in("client_id", clientIds)
          .gte("created_at", thirtyDaysAgoIso()),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

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

  // Recent activity (Command Centre improvement #8) — merges the same
  // clients/requests/invoices/projects rows into one real, dated feed.
  // See studio-client-activity.ts's own comment on why "completed" isn't
  // one of the event kinds (projects has no real completed_at to draw
  // it from).
  const recentActivity = computeRecentClientActivity(clients ?? [], requests ?? [], invoices ?? [], projects ?? []);

  const embedUsageByClient: Record<string, number> = {};
  for (const event of embedChatEvents ?? []) {
    if (!event.client_id) continue;
    embedUsageByClient[event.client_id] = (embedUsageByClient[event.client_id] ?? 0) + 1;
  }
  const aiAdoption = computeClientAiAdoption(clients ?? [], embedUsageByClient);

  // Actions Required (Command Centre Phase 1, turned into a real cleared
  // queue by improvement #1) — the genuinely urgent subset of what used
  // to be scattered across the checklist, the briefing, and the Requests
  // page's own count, gathered in one place. Only real, only shown when
  // non-zero — no "0 actions required" noise. actionsTotal stays the
  // real, uncapped sum (drives the headline and the TODAY strip's `todo`
  // stat); actionQueue is the capped, one-row-per-real-thing list
  // computeActionQueue() builds for the card itself to render with a
  // one-click clearing action per row (see its own comment for why).
  const actionsTotal = briefing.followUpsDue + overdueProjectCount + openRequestCount;
  const actionQueue = computeActionQueue(briefing.followUpsDueList, requests ?? [], projects ?? [], clients ?? [], today);

  // Model Performance + Business Health trend + AI adoption trend +
  // analytics (Command Centre Phase 6d / improvements #3 / #8 / Phase
  // 3) — four independent reads batched into one round trip instead of
  // four sequential awaits (a real-improvement pass fix, not how these
  // shipped originally): none of the four needs anything the others
  // produce, each only needs supabase/admin + orgId (+
  // agencyHealth.healthScore, already computed synchronously above from
  // data already in hand). ai_call_log and studio_health_snapshots/
  // studio_adoption_snapshots are service-role-only, same convention as
  // usage_events — read through the admin client, not the session-
  // scoped `supabase` this page uses everywhere else.
  //
  // Analytics is no longer a single fixed-30d call — chart blocks can
  // each pick their own range now (command-centre-layout.ts's own
  // comment on why), so this fetches every distinct range an org's
  // saved chart blocks actually use, not all four always. "30d" is
  // always included regardless: Insights below is a fixed, rule-based
  // 30-day view no matter what any chart block picked.
  const chartRanges = new Set<AnalyticsRange>(["30d"]);
  for (const block of blocks) {
    if (block.type === "chart" && block.metric !== "adoption" && block.metric !== "health") chartRanges.add(block.range);
  }

  const admin = getSupabaseAdmin();
  const [modelPerformance, healthTrend, adoptionSeries, healthSeries, analyticsEntries] = await Promise.all([
    admin ? getModelPerformance(admin, membership.orgId) : Promise.resolve(emptyModelPerformance()),
    admin && agencyHealth.healthScore !== null
      ? getHealthTrend(admin, membership.orgId, agencyHealth.healthScore)
      : Promise.resolve(null),
    admin ? getAdoptionSeries(admin, membership.orgId) : Promise.resolve([]),
    // Studio improvement — same real weekly-snapshot chart getAdoptionSeries()
    // already provides for AI adoption, now available for Business Health
    // too (studio_health_snapshots has always held this history; nothing
    // before this turned it into a chart series).
    admin ? getHealthSeries(admin, membership.orgId) : Promise.resolve([]),
    Promise.all(Array.from(chartRanges).map(async (range) => [range, await getStudioAnalytics(supabase, membership.orgId, range)] as const)),
  ]);
  const analyticsByRange = Object.fromEntries(analyticsEntries) as Record<AnalyticsRange, AnalyticsData>;
  const analytics = analyticsByRange["30d"];

  // AI Insight Feed (Command Centre Phase 3) — rule-based, not
  // LLM-generated (see studio-insights.ts's own comment on why). Reuses
  // the same 30-day analytics computation the Analytics page itself
  // shows, so an insight's numbers are never out of step with what a
  // tenant sees if they click through to investigate it.
  const insights = generateInsights(analytics, agencyHealth, overdueProjectCount, modelPerformance);

  // TODAY masthead (see today-strip.tsx's own comment) — every value
  // here is one already computed above for the briefing/actions-required
  // sections, just surfaced first and more prominently.
  // Short enough to actually fit one of four columns without truncating
  // mid-word — "New prospects this week" etc. were being cut to "New
  // prospects this w…" at real column widths. "This week"/"today" is
  // redundant anyway once it's sitting under a section literally
  // labelled TODAY.
  //
  // Command Centre improvement #6 — configurable, on explicit direction
  // overriding today-strip.tsx's own original "deliberately not
  // configurable" reasoning. todayStatPool is every real number this
  // page already computes that's a plausible TODAY stat, keyed by
  // TodayStatId; resolveTodayStrip() (today-strip-config.ts) picks which
  // 4 of them, and in what order, this org actually chose — falling
  // back to the original 4 in their original order for every org that's
  // never customised this.
  const todayStatPool: Record<TodayStatId, TodayStat> = {
    new_prospects: { id: "new_prospects", value: briefing.newThisWeek, label: TODAY_STAT_LABELS.new_prospects, icon: Sparkles },
    needs_reply: {
      id: "needs_reply",
      value: openRequestCount,
      label: TODAY_STAT_LABELS.needs_reply,
      icon: Inbox,
      tone: openRequestCount > 0 ? "urgent" : "default",
    },
    pipeline: {
      id: "pipeline",
      value: Math.round(pipelineValuePence / 100),
      label: TODAY_STAT_LABELS.pipeline,
      icon: PoundSterling,
      prefix: "£",
    },
    todo: { id: "todo", value: actionsTotal, label: TODAY_STAT_LABELS.todo, icon: ListChecks, tone: actionsTotal > 0 ? "urgent" : "default" },
    total_prospects: { id: "total_prospects", value: prospectCount ?? 0, label: TODAY_STAT_LABELS.total_prospects, icon: Search },
    clients: { id: "clients", value: clientCount, label: TODAY_STAT_LABELS.clients, icon: Users },
    engagement_risk: {
      id: "engagement_risk",
      value: engagementRisks.length,
      label: TODAY_STAT_LABELS.engagement_risk,
      icon: ShieldAlert,
      tone: engagementRisks.length > 0 ? "urgent" : "default",
    },
    followups_due: {
      id: "followups_due",
      value: briefing.followUpsDue,
      label: TODAY_STAT_LABELS.followups_due,
      icon: BellRing,
      tone: briefing.followUpsDue > 0 ? "urgent" : "default",
    },
    overdue_projects: {
      id: "overdue_projects",
      value: overdueProjectCount,
      label: TODAY_STAT_LABELS.overdue_projects,
      icon: FolderClock,
      tone: overdueProjectCount > 0 ? "urgent" : "default",
    },
  };
  const todayStats: TodayStat[] = resolveTodayStrip(org?.today_strip_stats).map((id) => todayStatPool[id]);

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
  // Real-improvement pass — the actual card JSX now lives in
  // command-centre-stat-cards.tsx (page.tsx was flagged at 1,197+
  // lines in the studio review); this stays exactly the 5 real inputs
  // that builder needs.
  const statContent = buildStatContent({ agencyHealth, healthTrend, prospectCount, clientCount, pipelineValuePence });

  // Section blocks (Actions required / Insights / Your briefing / …) —
  // content is null when there's nothing real to show, same "only
  // render with real content" rule Phase 1/3 already established. A
  // block present in the saved layout but with no real content right
  // now simply renders nothing for that slot, rather than an empty card.
  // Real-improvement pass — the actual card JSX for all 9 section types
  // now lives in command-centre-section-cards.tsx; this stays exactly
  // the real inputs that builder needs, one per card, never the full
  // union of everything the page computes.
  const sectionContent = buildSectionContent({
    actionQueue,
    actionsTotal,
    insights,
    hasBriefingContent,
    briefing,
    engagementRisks,
    // "Send payment reminder" (Engagement Risk card) — HamishAI's own org
    // always qualifies (sendClientEmail's real identity); a tenant org
    // qualifies too once it's set a reply-to email in Settings (roadmap
    // item #1, send-org-email.ts). Neither one true means the send would
    // go out under nobody's real name, so the control stays hidden — same
    // "only show what's real" rule as everywhere else in Studio.
    canSendClientEmail: Boolean(org?.is_internal) || Boolean((org?.brand as { replyToEmail?: string } | null)?.replyToEmail),
    modelPerformance,
    aiAdoption,
    recentActivity,
    agencyHealth,
  });

  // Renders one non-stat block exactly as before (same JSX per type,
  // same "a section with no real content renders nothing" rule) — split
  // out from the old single .map() so it can be called once per block
  // while grouping the results by tab, instead of grouping being another
  // layer on top of a single flat render pass.
  function renderContentBlock(block: Exclude<Block, { type: "stat" }>): ReactNode {
    if (
      block.type === "actions_required" ||
      block.type === "insights" ||
      block.type === "briefing" ||
      block.type === "engagement_risk" ||
      block.type === "model_performance" ||
      block.type === "client_ai_adoption" ||
      block.type === "top_prospects" ||
      block.type === "recent_activity" ||
      block.type === "health_breakdown"
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
      // adoption (Command Centre improvement #8) reads adoptionSeries,
      // the weekly-snapshotted trend studio-adoption-history.ts builds —
      // real points only once the weekly cron has actually run at least
      // once, same "empty rather than fabricated" rule as revenue/
      // prospects before any data existed for them either. revenue/
      // prospects now read whichever range this specific block picked
      // (real-improvement pass — see command-centre-layout.ts's own
      // comment on why), off analyticsByRange rather than a single
      // fixed-30d analytics object.
      const rangeData = block.metric === "adoption" || block.metric === "health" ? null : analyticsByRange[block.range];
      // Studio improvement — health reads healthSeries, the same real
      // weekly-snapshotted shape adoption already reads from adoptionSeries
      // (getHealthSeries(), studio-health-history.ts).
      const series =
        block.metric === "revenue"
          ? rangeData!.revenueSeries
          : block.metric === "prospects"
            ? rangeData!.prospectsSeries
            : block.metric === "health"
              ? healthSeries
              : adoptionSeries;
      // Studio improvement — prospects gets the same real projectSeries()
      // forecast revenue already had; AnalyticsChart itself already gates
      // rendering it to kind==="area" (a dashed line reads naturally as a
      // continuing trend; a projected bar doesn't), so passing it through
      // for every metric/kind combo is exactly as safe as revenue's own
      // wiring, not a new risk — a "New prospects" block an org configured
      // as an area chart was silently missing this before.
      const forecast = block.metric === "revenue" ? rangeData!.revenueForecast : block.metric === "prospects" ? rangeData!.prospectsForecast : undefined;
      const format = block.metric === "revenue" ? "money" : block.metric === "adoption" || block.metric === "health" ? "percent" : "count";
      return (
        <div key={block.id} className={block.span === 2 ? "sm:col-span-2" : undefined}>
          <Card className="h-full border-none bg-card text-card-foreground">
            <CardContent className="p-5">
              <p className="text-sm font-semibold">
                {CHART_METRIC_LABELS[block.metric]}{" "}
                {block.metric === "adoption" || block.metric === "health" ? "over time" : `— ${RANGE_LABELS[block.range]}`}
              </p>
              <AnalyticsChart
                series={series}
                forecast={forecast}
                kind={block.kind}
                format={format}
                height={180}
                emptyMessage={
                  block.metric === "adoption" || block.metric === "health"
                    ? "No weekly snapshot yet — check back after Monday's cron run."
                    : "No data in this period yet."
                }
              />
            </CardContent>
          </Card>
        </div>
      );
    }
    if (block.type === "text") {
      return (
        <div key={block.id} className={block.span === 2 ? "sm:col-span-2" : undefined}>
          <Card className="h-full border-none bg-card text-card-foreground">
            <CardContent className="p-5">
              <p className="font-heading text-sm font-semibold">{block.title}</p>
              <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{block.body}</p>
            </CardContent>
          </Card>
        </div>
      );
    }
    // cta — an external https link (isSafeHref() in command-centre-
    // layout.ts already rejected anything else) opens in a new tab with
    // rel="noopener noreferrer"; an internal path uses Next's own Link
    // like every other in-app link on this page.
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
  }

  // Home page tabs (see blockTab()'s own comment) — every non-stat block
  // rendered once, grouped into its tab in the org's existing saved
  // order. A tab with nothing real in it (every block in it hidden, or
  // its section genuinely has no content right now) is simply left out
  // of the tab bar entirely — same "don't show an empty shell" rule as
  // every individual section already followed, just applied one level
  // up. Exactly one populated tab skips the tab chrome outright: a
  // single-tab tab bar would be UI for its own sake.
  // Product Director + UX/UI Director follow-up (2026-08) to the card-
  // hierarchy fix (40e0552/0c4b85f/e5931f7) — the color/ring treatment
  // fixed *visibility* (actions_required no longer looks identical to
  // every other card), but not *position*: it was still just one block
  // among however many an org's own saved Overview-tab order put it
  // among, same as TodayStrip/the stat row used to be before they were
  // pulled out of the reorderable canvas for the same "shouldn't be
  // hideable" reason (see the stat row's own comment above). Deliberately
  // NOT the same as show/hide, which stays a real per-org choice: if a
  // tenant has removed this block from their layout entirely
  // (Settings → Command Centre layout), it's genuinely absent here, same
  // as before. What changes is that when it IS present, it always
  // renders in one fixed spot — right after the stat row/checklist,
  // before any tab — rather than wherever the org's own block order (or
  // whichever tab happened to claim it) put it.
  const actionsRequiredBlock = blocks.find((b) => b.type === "actions_required");
  const actionsRequiredContent = actionsRequiredBlock ? sectionContent.actions_required : null;

  const tabContent: Record<CommandCentreTabId, ReactNode[]> = { overview: [], prospects: [], clients: [], performance: [] };
  for (const block of blocks) {
    if (block.type === "stat" || block.type === "actions_required") continue;
    const rendered = renderContentBlock(block);
    if (rendered) tabContent[blockTab(block)].push(rendered);
  }
  const populatedTabs = COMMAND_CENTRE_TAB_ORDER.filter((id) => tabContent[id].length > 0);

  // Real-improvement pass — which tab was last active, read server-side
  // so the very first render already shows the right one (see command-
  // centre-tabs.tsx's own comment on why a cookie, not localStorage).
  // Falls back to the first populated tab whenever the cookied one isn't
  // valid right now — no cookie yet, or a tab that's since emptied out.
  const cookieStore = await cookies();
  const cookiedTab = cookieStore.get("studio_cc_tab")?.value;
  const activeTab = populatedTabs.includes(cookiedTab as CommandCentreTabId) ? (cookiedTab as CommandCentreTabId) : populatedTabs[0];

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

      {/* Stat row (Command Centre Phase 5b/5c — see Settings → Command
          Centre layout for show/hide/reorder/width). Always visible,
          never tab-scoped — same "the org's own headline numbers
          shouldn't be behind a click" reasoning as the TODAY masthead
          above. 5 columns, every default stat card at span 1: genuinely
          uniform width, not just close — see command-centre-layout.ts's
          own comment on why health gave up its old span-2 default.
          items-start, not the grid default (stretch): even with health
          compacted for its new single-width column (a smaller ring,
          one-line driver rows — see the health card's own comment), it
          still holds more real content than a plain "icon, number,
          label" stat card and is naturally a bit taller. Stretching
          every card in a row to match the tallest one papers over that
          with visibly empty space in the shorter cards — worse than a
          small, real height difference between a hero card and its
          plainer neighbours, which is a completely ordinary dashboard
          pattern. */}
      <Reveal delay={80} className="mt-6 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {blocks
          .filter((b): b is Extract<Block, { type: "stat" }> => b.type === "stat")
          .map((block) => (
            <div key={block.id} className={block.span === 2 ? "sm:col-span-2" : undefined}>
              {statContent[block.cardId]}
            </div>
          ))}
      </Reveal>

      {/* Getting set up (P1 onboarding checklist) — deliberately not a
          block: it's a temporary, self-removing section (see its own
          comment below), not a permanent piece of the layout an agency
          would want to reorder or hide. Moved here, right after the
          stat row and ahead of the tabs, in the professional-feel pass
          — it used to render after the whole tabbed area, meaning the
          org that most needs this (a brand-new one, nothing set up yet)
          had to scroll past every populated tab to reach it. */}
      {!checklistComplete && (
        <Card className="mt-6 border-none bg-card text-card-foreground">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-muted-foreground">Getting set up</p>
            <ul className="mt-4 space-y-2.5">
              {checklist.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 text-sm ${item.done ? "text-muted-foreground" : "hover:text-accent"}`}
                  >
                    {item.done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-accent" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-muted-foreground/40" />
                    )}
                    <span className={item.done ? "line-through" : ""}>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Actions required — always the first thing after the numbers,
          before any tab (see the fixed-position comment above
          tabContent's own loop for the full reasoning). Full-width, same
          treatment its own card already had inside the block grid. */}
      {actionsRequiredContent && <Reveal delay={110} className="mt-6">{actionsRequiredContent}</Reveal>}

      {/* Everything else (Insights / Your briefing / Engagement risk /
          Model performance / Client AI adoption / Top prospects / Recent
          activity / Business Health breakdown, plus any chart/text/cta
          blocks) — grouped into tabs instead of one long vertical stack,
          now that the block library has grown to 9 section types plus
          whatever charts/text/cta an org's added (see blockTab()'s own
          comment on the grouping and why it's presentation-only:
          Settings → Command Centre layout still owns order/width/
          visibility per block, unchanged — actions_required excluded
          here since it's rendered in its own fixed spot above). A tab
          with nothing real in it isn't shown at all; exactly one
          populated tab skips the tab bar outright. */}
      {populatedTabs.length > 1 ? (
        <Reveal delay={140} className="mt-6">
          <CommandCentreTabs
            activeTab={activeTab}
            tabs={populatedTabs.map((id) => ({
              id,
              label: COMMAND_CENTRE_TAB_LABELS[id],
              content: <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-5">{tabContent[id]}</div>,
            }))}
          />
        </Reveal>
      ) : populatedTabs.length === 1 ? (
        <Reveal delay={140} className="mt-6 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {tabContent[populatedTabs[0]]}
        </Reveal>
      ) : null}

      {config.services && config.services.length > 0 && (
        <Card className="mt-6 border-none bg-card text-card-foreground">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-muted-foreground">What you&apos;re set up to sell</p>
            <ul className="mt-4 space-y-2 text-sm">
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
    </div>
  );
}
