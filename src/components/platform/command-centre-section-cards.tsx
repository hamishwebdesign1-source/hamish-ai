import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Lightbulb,
  Sparkles,
  Send,
  Search,
  TriangleAlert,
  Zap,
  ShieldAlert,
  Cpu,
  Bot,
  History,
  Activity,
  Users,
  Inbox,
  PoundSterling,
  Rocket,
  BellRing,
  FolderClock,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/platform/help-tip";
import { TopOpportunityKitAction } from "@/components/platform/top-opportunity-kit-action";
import { SendInvoiceReminderAction } from "@/components/platform/send-invoice-reminder-action";
import { QueueItemAction } from "@/components/platform/queue-item-action";
import { timeAgo } from "@/lib/time-ago";
import type { SectionType } from "@/lib/command-centre-layout";
import type { ClientHealth } from "@/lib/client-health";
import type { Insight, InsightCategory } from "@/lib/studio-insights";
import type { StudioBriefing } from "@/lib/studio-briefing";
import type { ClientEngagementRisk, EngagementTier } from "@/lib/studio-engagement";
import { FEATURE_LABELS, type ModelPerformanceWithCost, type AiFeature } from "@/lib/studio-model-performance";
import type { AiAdoption } from "@/lib/studio-ai-adoption";
import type { ClientActivityItem, ClientActivityKind } from "@/lib/studio-client-activity";
import type { ActionQueueItem, ActionQueueKind } from "@/lib/studio-action-queue";

// Real-improvement pass — the other half of the page.tsx extraction
// buildStatContent() (command-centre-stat-cards.tsx) started. Each of
// the 9 section cards needs only a handful of real inputs — never the
// two-dozen-value union across all of them — so this is genuinely one
// parameterised function per card, not a single "props soup" builder.
// Content is null/undefined whenever there's nothing real to show,
// same "only render with real content" rule as every other part of
// this app — page.tsx's own render loop already treats a missing entry
// here as "render nothing for this slot."
//
// UX/UI Director audit (2026-08) — only actions_required (below) keeps
// bg-primary/text-primary-foreground: it's "your most urgent action
// right now" and is meant to read as the featured surface, same tier as
// TodayStrip. The other 8 section cards used to share that identical
// dark treatment, which flattened them all to the same visual weight as
// the one card that's genuinely urgent. They use plain bg-card/
// text-card-foreground instead now, with text-muted-foreground in place
// of the old text-primary-foreground/NN opacity tiers and bg-secondary
// in place of bg-white/10 for track/pill backgrounds — the same tokens
// every other Studio card already uses (clients-panel.tsx,
// campaigns-panel.tsx).
//
// Follow-up (2026-08) — bg-primary alone measured as only a small real
// gap from bg-card (verified via a live authenticated session's exact
// computed pixel values), correct but easy to miss at a glance. See
// today-strip.tsx's matching comment for the full reasoning on why this
// adds an accent ring here rather than widening --primary itself
// (shared with Button's default variant — would ripple into every
// primary button across Studio).

// Roadmap item #3 ("predictive churn detection") — early_warning gets its
// own, deliberately quieter treatment (secondary/muted, not
// destructive/warning) rather than reusing "warning"'s orange: it's a
// real signal, but a lower-confidence, earlier one than either threshold
// tier, and styling it the same as an active overdue-invoice/quiet-weeks
// case would be alarm fatigue for something that's still just a trend.
const TIER_LABEL: Record<EngagementTier, string> = {
  critical: "critical",
  warning: "warning",
  early_warning: "trending down",
};
const TIER_BADGE_CLASS: Record<EngagementTier, string> = {
  critical: "bg-destructive/15 text-destructive",
  warning: "bg-warning/15 text-warning",
  early_warning: "bg-secondary text-muted-foreground",
};

const INSIGHT_ICON: Record<InsightCategory, LucideIcon> = {
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

// Recent activity (Command Centre improvement #8) — one icon per real
// event kind computeRecentClientActivity() can return.
const ACTIVITY_ICON: Record<ClientActivityKind, LucideIcon> = {
  client_joined: Users,
  request_received: Inbox,
  request_responded: Send,
  invoice_paid: PoundSterling,
  project_started: Rocket,
};

// Command Centre improvement #1 ("cleared queue, not a dashboard") — one
// icon per real row kind computeActionQueue() can return, rendered
// directly in this Server Component's own JSX (safe — unlike handing a
// component reference to QueueItemAction as a prop, which is what
// actually crashed production; see that file's own comment). The
// one-click clearing action itself lives entirely inside QueueItemAction
// now, keyed off item.kind — nothing here needs to know which Server
// Action each kind calls.
const QUEUE_ICON: Record<ActionQueueKind, LucideIcon> = {
  follow_up: BellRing,
  unanswered_request: Inbox,
  overdue_project: FolderClock,
};

// Real-data colour tiers for the Business Health breakdown bars — same
// 80/50 thresholds clients-panel.tsx's own healthBadgeVariant() already
// uses for the identical per-client score, just applied per-component
// here instead of to one overall number.
function healthBarColor(value: number): string {
  if (value >= 80) return "bg-accent";
  if (value >= 50) return "bg-warning";
  return "bg-destructive";
}

export function buildSectionContent(params: {
  actionQueue: ActionQueueItem[];
  actionsTotal: number;
  insights: Insight[];
  hasBriefingContent: boolean;
  briefing: StudioBriefing;
  engagementRisks: ClientEngagementRisk[];
  // Gates the "Send payment reminder" action — true for HamishAI's own
  // org, or any tenant org that's configured a reply-to email in Settings
  // (roadmap item #1, send-org-email.ts). See page.tsx's own comment on
  // why both cases qualify.
  canSendClientEmail: boolean;
  modelPerformance: ModelPerformanceWithCost;
  aiAdoption: AiAdoption;
  recentActivity: ClientActivityItem[];
  agencyHealth: ClientHealth;
}): Partial<Record<SectionType, ReactNode>> {
  const { actionQueue, actionsTotal, insights, hasBriefingContent, briefing, engagementRisks, canSendClientEmail, modelPerformance, aiAdoption, recentActivity, agencyHealth } =
    params;
  const actionsRemaining = actionsTotal - actionQueue.length;

  return {
    // Command Centre improvement #1 ("cleared queue, not a dashboard") —
    // each row is now one real, actionable thing (one prospect due a
    // follow-up, one unanswered request, one overdue project), not an
    // aggregate count linking off to go handle it manually. Clicking the
    // one-click control (queueItemAction()) clears that exact row via the
    // same Server Action its own dedicated page already uses, no new
    // write path. actionsTotal (the real, uncapped count) still drives
    // the "+N more" line below when computeActionQueue()'s own 8-item cap
    // hides some of the real total.
    actions_required:
      actionQueue.length > 0 ? (
        <Card className="border-none bg-primary text-primary-foreground ring-accent/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground/70">
                <AlertTriangle className="size-3.5 shrink-0 text-destructive" /> Your next best actions
              </p>
              <HelpTip explanation="Real items pulled together from three places — prospects due a follow-up, client requests you haven't replied to yet, and projects past their target date. Clear one right here, or click through to handle it properly. Only shown when something's actually due." />
            </div>
            <ol className="mt-4 space-y-4">
              {actionQueue.map((item, i) => {
                const Icon = QUEUE_ICON[item.kind];
                return (
                  <li key={`${item.kind}:${item.id}`} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/15 font-mono text-[11px] font-semibold text-destructive">
                      {i + 1}
                    </span>
                    <Icon className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <div className="min-w-0 flex-1">
                      <Link href={item.href} className="group flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-primary-foreground group-hover:underline">{item.businessName}</span>
                        <ArrowRight className="size-3 shrink-0 text-primary-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-primary-foreground/60">{item.detail}</p>
                      <QueueItemAction item={item} />
                    </div>
                  </li>
                );
              })}
            </ol>
            {actionsRemaining > 0 && (
              <p className="mt-4 text-xs text-primary-foreground/60">
                +{actionsRemaining} more — see Prospects, Requests, and Projects for the full lists.
              </p>
            )}
          </CardContent>
        </Card>
      ) : undefined,
    insights:
      insights.length > 0 ? (
        <Card className="border-none bg-card text-card-foreground">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Insights</p>
              <HelpTip explanation="AI-generated observations based on your latest platform data — real deltas and thresholds, never invented patterns. Each one shows the exact numbers behind it." />
            </div>
            <div className="mt-4 space-y-3">
              {insights.map((insight) => {
                const Icon = INSIGHT_ICON[insight.category];
                return (
                  <div key={insight.id} className={`flex items-start gap-3 rounded-lg border-l-2 bg-secondary/40 py-2 pr-2 pl-3 ${INSIGHT_BORDER[insight.category]}`}>
                    <Icon className={`mt-0.5 size-4 shrink-0 ${INSIGHT_COLOR[insight.category]}`} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {insight.headline}
                        {insight.impact === "high" && (
                          <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                            Priority
                          </span>
                        )}
                      </p>
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
      <Card className="border-none bg-card text-card-foreground">
        <CardContent className="p-5">
          <p className="text-xs font-semibold text-muted-foreground">Your briefing</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
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
            <div className="mt-4 rounded-lg border border-accent/25 bg-accent/10 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                <Lightbulb className="size-3.5 shrink-0" />
                Your best opportunity right now
              </p>
              <p className="mt-1 text-sm font-medium">
                {briefing.topOpportunity.businessName}{" "}
                <span className="font-mono text-xs font-normal text-muted-foreground">({briefing.topOpportunity.overallScore}/5)</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{briefing.topOpportunity.pursueBecause}</p>
              <TopOpportunityKitAction prospectId={briefing.topOpportunity.id} hasKitInitially={briefing.topOpportunity.hasSalesKit} />
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
        <Card className="border-none bg-card text-card-foreground">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <ShieldAlert className="size-3.5 shrink-0 text-destructive" /> Engagement risk
              </p>
              <HelpTip explanation="Clients who've gone 2+ weeks without a request, have an invoice past its due date, or whose contact frequency has genuinely dropped versus the 3 weeks before (early warning) — real dates and counts, never a prediction. A client with none of these simply isn't listed here." />
            </div>
            <ul className="mt-4 space-y-3">
              {engagementRisks.slice(0, 5).map((risk) => {
                const detailParts = [
                  risk.quietWeeks > 0 && `Quiet ${risk.quietWeeks} week${risk.quietWeeks === 1 ? "" : "s"}`,
                  risk.hasOverdueInvoice && "Invoice overdue",
                  // Only shown when it's the *only* real signal (the
                  // quietWeeks>=2/overdue-invoice cases already say
                  // something more specific) — early_warning is the one
                  // tier this can be true for with neither of those set.
                  risk.quietWeeks === 0 && !risk.hasOverdueInvoice && risk.trend === "declining" && "Contact frequency dropping",
                ].filter(Boolean);
                return (
                  <li key={risk.clientId} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{risk.businessName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{detailParts.join(" · ")}</p>
                      {canSendClientEmail && risk.hasOverdueInvoice && risk.overdueInvoiceId && (
                        <SendInvoiceReminderAction invoiceId={risk.overdueInvoiceId} alreadySentInitially={Boolean(risk.reminderSentAt)} />
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {risk.weeks.map((week, i) => (
                        <span key={i} title={week.label} className={`size-2.5 rounded-sm ${week.active ? "bg-accent/70" : "bg-secondary"}`} />
                      ))}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide uppercase ${TIER_BADGE_CLASS[risk.tier]}`}
                    >
                      {TIER_LABEL[risk.tier]}
                    </span>
                  </li>
                );
              })}
            </ul>
            {engagementRisks.length > 5 && (
              <p className="mt-3 text-xs text-muted-foreground">
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
    // Command Centre Phase 6d, extended by improvement #5 — real
    // success rate, latency and cost for this org's own two Claude-
    // backed features, off ai_call_log. Only shown once there's at
    // least one real call to report — same rule as every other section
    // here. Cost now converts to £ using a real, daily-fetched USD/GBP
    // rate (fx-rate.ts) when one's available, falling back to the raw
    // $ figure — never an invented rate — before the first cron run.
    model_performance:
      modelPerformance.callCount > 0 ? (
        <Card className="border-none bg-card text-card-foreground">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Cpu className="size-3.5 shrink-0" /> Model performance
              </p>
              <HelpTip explanation="Real success rate, latency and estimated cost for your AI Design Assistant and AI Business Analyst calls over the last 30 days. Cost starts from Anthropic's published per-token USD rate, then converts to £ using a real, daily-refreshed USD/GBP reference rate — shown with the date it was fetched, never presented as live." />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <p className="font-heading text-xl font-semibold tabular-nums">{modelPerformance.successRatePct}%</p>
                <p className="text-xs text-muted-foreground">Success rate</p>
              </div>
              <div>
                <p className="font-heading text-xl font-semibold tabular-nums">
                  {modelPerformance.medianLatencyMs !== null ? `${(modelPerformance.medianLatencyMs / 1000).toFixed(1)}s` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Median latency</p>
              </div>
              <div>
                <p className="font-heading text-xl font-semibold tabular-nums">
                  {modelPerformance.estimatedCostGbp !== null
                    ? `£${modelPerformance.estimatedCostGbp.toFixed(2)}`
                    : modelPerformance.estimatedCostUsd !== null
                      ? `$${modelPerformance.estimatedCostUsd.toFixed(2)}`
                      : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Est. cost, 30d
                  {modelPerformance.estimatedCostGbp !== null && modelPerformance.estimatedCostUsd !== null && (
                    <span className="text-muted-foreground/70"> (${modelPerformance.estimatedCostUsd.toFixed(2)})</span>
                  )}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {modelPerformance.callCount} call{modelPerformance.callCount === 1 ? "" : "s"} in the last 30 days
              {modelPerformance.estimatedCostGbp !== null && modelPerformance.fxRateFetchedAt && (
                <>
                  {" "}
                  · £ converted at the USD/GBP rate as of{" "}
                  {new Date(modelPerformance.fxRateFetchedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </>
              )}
            </p>
            {/* Studio improvement — only shown once both features have
                real calls to break down; with only one feature in use,
                the aggregate above already *is* that feature's own
                number, so a breakdown would just repeat it. */}
            {modelPerformance.byFeature.design_assistant.callCount > 0 && modelPerformance.byFeature.business_analyst.callCount > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                {(Object.keys(FEATURE_LABELS) as AiFeature[]).map((feature) => {
                  const stats = modelPerformance.byFeature[feature];
                  return (
                    <div key={feature} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">{FEATURE_LABELS[feature]}</span>
                      <span className="font-mono text-muted-foreground">
                        {stats.callCount} call{stats.callCount === 1 ? "" : "s"} · {stats.successRatePct ?? "—"}% success
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : undefined,
    // Command Centre Phase 6d, extended by improvement #4 — see studio-
    // ai-adoption.ts's own comment on why usage depth (usedCount,
    // totalMessages) is now real, not "not tracked yet."
    client_ai_adoption:
      aiAdoption.activeClientCount > 0 ? (
        <Card className="border-none bg-card text-card-foreground">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Bot className="size-3.5 shrink-0" /> Client AI adoption
              </p>
              <HelpTip explanation="Share of your clients with the AI chatbot feature turned on for their own website, and how many of those actually had a real conversation in the last 30 days — enabled isn't the same as used." />
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <p className="font-heading text-2xl font-semibold tabular-nums">{aiAdoption.adoptionPct}%</p>
              <p className="text-sm text-muted-foreground">
                {aiAdoption.adoptedCount} of {aiAdoption.activeClientCount} client{aiAdoption.activeClientCount === 1 ? "" : "s"} have the AI chatbot
                enabled
              </p>
            </div>
            {aiAdoption.adoptedCount > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {aiAdoption.usedCount} of {aiAdoption.adoptedCount} enabled client{aiAdoption.adoptedCount === 1 ? "" : "s"} actually used it in the
                last 30 days · {aiAdoption.totalMessages} message{aiAdoption.totalMessages === 1 ? "" : "s"} total
              </p>
            )}
          </CardContent>
        </Card>
      ) : undefined,
    // Command Centre improvement #8 — the block canvas's first new
    // section type since Phase 6d. Same real scoring already behind
    // "Your briefing" own single best-opportunity box (studio-briefing.ts's
    // `scored` array) — this is that same list, just the top 5 instead
    // of only the head, for a tenant who wants the ranked list as its
    // own block rather than folded into Briefing.
    top_prospects:
      briefing.topOpportunities.length > 0 ? (
        <Card className="border-none bg-card text-card-foreground">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Lightbulb className="size-3.5 shrink-0" /> Top prospects
              </p>
              <HelpTip explanation="Your researched prospects, ranked by their real overall score (out of 5) — the same scoring your briefing's own best-opportunity box uses, just the top 5 instead of only the best one." />
            </div>
            <ol className="mt-4 space-y-3">
              {briefing.topOpportunities.map((opp, i) => (
                <li key={opp.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-[11px] font-semibold text-accent">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {opp.businessName}{" "}
                      <span className="font-mono text-xs font-normal text-muted-foreground">({opp.overallScore}/5)</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{opp.pursueBecause}</p>
                    {/* Fast-follow to the shipped topOpportunity callout action
                        (backlog: "Wire the same outreach-kit action to Command
                        Centre's Top Prospects list") — same generateSalesKit()
                        Server Action, same component, one independent instance
                        per row keyed off that row's own real id/hasSalesKit so
                        one row's pending/success/error state can't leak into
                        its siblings. compact=true here: 5 of the single-callout
                        treatment stacked in one card read as visually heavy,
                        so this uses the tighter xs-button rendering instead —
                        flagged for UX/UI Director rather than a settled call. */}
                    <TopOpportunityKitAction prospectId={opp.id} hasKitInitially={opp.hasSalesKit} compact />
                  </div>
                </li>
              ))}
            </ol>
            <Button variant="link" size="sm" className="mt-3 h-auto px-0 text-accent" render={<Link href="/studio/prospects" />}>
              View all prospects
              <ArrowRight className="size-3.5" />
            </Button>
          </CardContent>
        </Card>
      ) : undefined,
    // Command Centre improvement #8 — a real, dated feed merged from
    // rows other sections on this page already fetched (see studio-
    // client-activity.ts's own comment on why "completed" isn't one of
    // the event kinds).
    recent_activity:
      recentActivity.length > 0 ? (
        <Card className="border-none bg-card text-card-foreground">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <History className="size-3.5 shrink-0" /> Recent activity
              </p>
              <HelpTip explanation="A real, dated feed of what's happened across your client roster — new clients, requests received and replied to, invoices paid, projects started. Up to 8 most recent, newest first." />
            </div>
            <ol className="mt-4 space-y-3">
              {recentActivity.map((item) => {
                const Icon = ACTIVITY_ICON[item.kind];
                return (
                  <li key={item.id} className="flex items-start gap-3">
                    <Icon className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{item.businessName}</span> — {item.detail}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{timeAgo(item.occurredAt)}</span>
                  </li>
                );
              })}
            </ol>
            {/* Real-improvement pass — every sibling section with a real
                list (Top prospects, Your briefing) ends in a link to
                where the full picture lives; this one didn't, an
                inconsistency in this session's own earlier work. No
                per-record client route exists yet, same reasoning as
                command-search-actions.ts's own comment, so this points
                at the list, not one specific row. */}
            <Button variant="link" size="sm" className="mt-3 h-auto px-0 text-accent" render={<Link href="/studio/clients" />}>
              View all clients
              <ArrowRight className="size-3.5" />
            </Button>
          </CardContent>
        </Card>
      ) : undefined,
    // Professional-feel pass — the real component breakdown that used
    // to be crammed into the Business Health stat card (see that card's
    // own comment on why it moved). Full labels now that it has real
    // room, plus a coloured bar per component using the same 80/50
    // thresholds clients-panel.tsx's own healthBadgeVariant() already
    // uses for the identical score.
    health_breakdown:
      agencyHealth.healthScore !== null && agencyHealth.components.length > 0 ? (
        <Card className="border-none bg-card text-card-foreground">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Activity className="size-3.5 shrink-0" /> Business Health breakdown
              </p>
              <HelpTip explanation="Same real, measured components behind your Business Health score above — site uptime, on-time payment, work completed, requests moving, and pipeline conversion. Only components with real data are shown." />
            </div>
            <div className="mt-4 space-y-3">
              {agencyHealth.components.map((c) => (
                <div key={c.label}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="font-mono font-semibold">{c.value}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full rounded-full ${healthBarColor(c.value)}`} style={{ width: `${c.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : undefined,
  };
}
