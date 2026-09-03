"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  Zap,
  Sparkles,
  ArrowRight,
  MessagesSquare,
  Wallet,
  HeartPulse,
  CheckCircle2,
  FolderKanban,
} from "lucide-react";
import { HealthRing } from "@/components/analytics/health-ring";
import { VerticalBarChart, UptimeBar } from "@/components/portal/insight-charts";
import type { PortalInsights } from "@/lib/portal-insights-data";
import { PORTAL_PROJECT_STAGE_META, isProjectStage } from "@/lib/project-stages";

// Client portal redesign Phase 3 — the "AI Copilot" tab that used to live
// here moved to its own page (/portal/ask, see ai-copilot.tsx) as the
// portal's one clear AI entry point, in place of duplicating a full
// second chat surface (with its own, separate conversation) inside this
// tab. A link to it replaces the tab below.
const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "predictions", label: "Predictions", icon: TrendingUp },
  { id: "automations", label: "Automations", icon: Zap },
] as const;

type TabId = (typeof TABS)[number]["id"];

const CATEGORICAL = ["var(--chart-2)", "var(--chart-4)", "var(--chart-5)"];
const NEUTRAL = "oklch(0.7 0.01 260 / 40%)";

const CATEGORY_META: Record<string, { label: string; className: string }> = {
  opportunity: { label: "Opportunity", className: "border-l-emerald-400" },
  risk: { label: "Risk", className: "border-l-amber-400" },
  trend: { label: "Trend", className: "border-l-[var(--chart-4)]" },
};

// Studio improvement — the same target_date maths projects-panel.tsx
// (Studio's own equivalent card) already uses, kept as its own small
// local copy rather than importing that large "use client" panel module
// into the portal's own component tree just for one date helper.
function daysUntil(targetDate: string): number {
  const today = new Date(new Date().toDateString());
  const target = new Date(targetDate);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function OverviewTab({ data }: { data: PortalInsights }) {
  const maxFunnel = data.funnel[0]?.value || 1;
  const maxCategory = Math.max(...data.categoryBreakdown.map((c) => c.value), 1);

  return (
    <div className="tab-panel-enter">
      <div className="flex flex-col items-center gap-6 border-b border-white/10 pb-8 text-center sm:flex-row sm:text-left">
        {data.healthScore !== null ? (
          <HealthRing score={data.healthScore} size={140} strokeWidth={10} centerLabel={`${data.healthScore}`} centerSublabel="Account health" />
        ) : (
          <div className="flex size-[140px] shrink-0 items-center justify-center rounded-full border border-dashed border-white/15 text-center">
            <span className="px-4 text-xs text-primary-foreground/50">Not enough data yet</span>
          </div>
        )}
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.15em] text-primary-foreground/50 uppercase">
            {data.client.business_name}
          </p>
          <p className="mt-2 max-w-xl font-heading text-lg leading-snug text-primary-foreground/90 md:text-xl">
            {data.totalRequests} request{data.totalRequests === 1 ? "" : "s"} since we started working together
            {data.requestsLastMonth > 0 && (
              <> — {data.requestsThisMonth >= data.requestsLastMonth ? "up" : "down"} from {data.requestsLastMonth} last month</>
            )}
            . {data.uptimePct !== null ? `Site uptime is ${data.uptimePct}%.` : ""}
          </p>
        </div>
      </div>

      {data.components.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {data.components.map((c) => (
            <div key={c.label} className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-primary-foreground/5 p-4 text-center">
              <HealthRing score={c.value} size={64} strokeWidth={6} centerLabel={`${c.value}`} />
              <p className="text-xs font-medium text-primary-foreground/80">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Studio improvement — a client previously had zero visibility into
          their own website/deliverable project here, even though Studio's
          own Projects page has always tracked one for them. */}
      {data.projects.length > 0 && (
        <div className="mt-8 rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
          <div className="flex items-center gap-1.5">
            <FolderKanban className="size-4 text-accent" />
            <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">
              Your project{data.projects.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {data.projects.map((p) => {
              const days = p.target_date && p.status !== "done" ? daysUntil(p.target_date) : null;
              // Projects Kanban Command Centre, Phase A — the real
              // 5-stage pipeline, in client-facing copy (never the
              // internal enum label — see DECISIONS.md's matching
              // entry). Falls back to the old binary pill only for a
              // stage value this client-facing map doesn't recognise
              // (shouldn't happen once the migration backfills every
              // row, but never renders raw internal text either way).
              const stageMeta = isProjectStage(p.stage)
                ? PORTAL_PROJECT_STAGE_META[p.stage]
                : p.status === "done"
                  ? { label: "Completed", className: "bg-[var(--chart-2)]/15 text-[var(--chart-2)]" }
                  : { label: "In progress", className: "bg-accent/15 text-accent" };
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-primary-foreground">{p.name}</p>
                    {days !== null && (
                      <p className="mt-0.5 text-xs text-primary-foreground/50">
                        {days < 0
                          ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
                          : days === 0
                            ? "Due today"
                            : `${days} day${days === 1 ? "" : "s"} left`}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${stageMeta.className}`}>
                    {stageMeta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
          <div className="flex items-center gap-1.5">
            <MessagesSquare className="size-4 text-accent" />
            <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">Requests by month</p>
          </div>
          <div className="mt-5">
            <VerticalBarChart data={data.requestsByMonth} />
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
          <div className="flex items-center gap-1.5">
            <Wallet className="size-4 text-accent" />
            <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">Spend by month</p>
          </div>
          <div className="mt-5">
            <VerticalBarChart data={data.spendByMonth} formatValue={(v) => `£${v.toFixed(0)}`} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
          <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">Request funnel</p>
          <div className="mt-4 space-y-3">
            {data.funnel.map((step) => (
              <div key={step.label}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium text-primary-foreground/80">{step.label}</span>
                  <span className="font-mono tabular-nums text-primary-foreground/60">{step.value}</span>
                </div>
                <div className="mt-1 h-3 w-full rounded-sm bg-primary-foreground/10">
                  <div
                    className="h-full"
                    style={{ width: `${(step.value / maxFunnel) * 100}%`, background: "var(--chart-2)", borderRadius: "0 4px 4px 0" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
          <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">What you ask us for</p>
          {!data.categoryBreakdown.length && <p className="mt-4 text-sm text-primary-foreground/50">No requests yet.</p>}
          <div className="mt-4 space-y-2.5">
            {data.categoryBreakdown.map((c, i) => (
              <div key={c.category}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-primary-foreground/70">
                    <span className="size-2 rounded-full" style={{ background: CATEGORICAL[i % CATEGORICAL.length] ?? NEUTRAL }} />
                    {c.label}
                  </span>
                  <span className="font-mono tabular-nums text-primary-foreground/50">{c.value}</span>
                </div>
                <div className="mt-1 h-3 w-full rounded-sm bg-primary-foreground/10">
                  <div
                    className="h-full"
                    style={{ width: `${(c.value / maxCategory) * 100}%`, background: CATEGORICAL[i % CATEGORICAL.length] ?? NEUTRAL, borderRadius: "0 4px 4px 0" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">Living insights</p>
        <ul className="mt-4 space-y-3">
          {data.insights.map((insight) => (
            <li
              key={insight.id}
              className={`feed-item-enter rounded-lg border-l-4 bg-primary-foreground/5 px-4 py-3 ${CATEGORY_META[insight.category].className}`}
            >
              <p className="text-sm text-primary-foreground">{insight.text}</p>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/portal/ask"
        className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-primary-foreground/5 px-5 py-4 transition-colors hover:bg-primary-foreground/10"
      >
        <span className="flex items-center gap-2 text-sm text-primary-foreground">
          <Sparkles className="size-4 shrink-0 text-[var(--gradient-violet)]" />
          Have a question about this data? Ask {data.orgBranding.name}.
        </span>
        <ArrowRight className="size-4 shrink-0 text-primary-foreground/50" />
      </Link>
    </div>
  );
}

function PredictionsTab({ data }: { data: PortalInsights }) {
  const max = Math.max(...data.demandPattern.flatMap((d) => d.slots), 1);

  return (
    <div className="tab-panel-enter space-y-6">
      <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
        <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">
          Next month, at your current pace
        </p>
        <p className="mt-1 text-xs text-primary-foreground/50">
          A simple projection off your own history — not a business forecast, just where the trend points.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-wide text-primary-foreground/40 uppercase">Requests</p>
            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
              {data.projectedRequestsNextMonth ?? "—"}
            </p>
            {data.projectedRequestsNextMonth === null && (
              <p className="mt-1 text-[11px] text-primary-foreground/40">Not enough history yet</p>
            )}
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-wide text-primary-foreground/40 uppercase">Spend</p>
            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
              {data.projectedSpendNextMonth !== null ? `£${data.projectedSpendNextMonth}` : "—"}
            </p>
            {data.projectedSpendNextMonth === null && (
              <p className="mt-1 text-[11px] text-primary-foreground/40">Not enough history yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
        <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">
          When you send us requests
        </p>
        <div className="mt-4 grid grid-cols-[auto_repeat(3,1fr)] gap-1.5 text-center">
          <div />
          {data.dayparts.map((d) => (
            <p key={d} className="text-[10px] text-primary-foreground/50">
              {d}
            </p>
          ))}
          {data.demandPattern.map((row) => (
            <div key={row.day} className="contents">
              <p className="flex items-center pr-2 text-[11px] text-primary-foreground/60">{row.day}</p>
              {row.slots.map((value, i) => (
                <div
                  key={i}
                  title={`${row.day} ${data.dayparts[i]}: ${value}`}
                  className="aspect-square rounded-md"
                  style={{ backgroundColor: value > 0 ? `color-mix(in oklch, var(--chart-2) ${(value / max) * 100}%, transparent)` : "var(--primary-foreground-05, rgba(255,255,255,0.04))" }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {data.uptimePct !== null && (
        <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
          <div className="flex items-center gap-1.5">
            <HeartPulse className="size-4 text-accent" />
            <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">Site health, recent checks</p>
          </div>
          <div className="mt-4">
            <UptimeBar checks={data.siteChecks} />
          </div>
        </div>
      )}
    </div>
  );
}

function AutomationsTab({ data }: { data: PortalInsights }) {
  return (
    <div className="tab-panel-enter space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5 text-center">
          <p className="font-heading text-2xl font-semibold tabular-nums">{data.autoReplyCount}</p>
          <p className="mt-1 text-xs text-primary-foreground/50">Replies sent automatically</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5 text-center">
          <p className="font-heading text-2xl font-semibold tabular-nums">{data.siteCheckCount}</p>
          <p className="mt-1 text-xs text-primary-foreground/50">Site checks run</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">Recent activity</p>
        </div>
        {!data.automationEvents.length && <p className="mt-4 text-sm text-primary-foreground/50">Nothing automated yet.</p>}
        <ul className="mt-4 space-y-2.5">
          {data.automationEvents.map((event, i) => (
            <li
              key={event.id}
              className="feed-item-enter flex items-start gap-3 rounded-lg bg-primary-foreground/5 px-3.5 py-2.5"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm text-primary-foreground">{event.label}</p>
                <p className="text-xs text-primary-foreground/50">
                  {event.detail} · {new Date(event.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function InsightsCentre({ data }: { data: PortalInsights }) {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10 bg-primary text-primary-foreground shadow-2xl shadow-accent/20"
      // Client portal redesign Phase 1 — this panel is deliberately an
      // always-dark hero, independent of the portal's own light/dark
      // toggle (added this stage). --primary/--primary-foreground are
      // semantic tokens that intentionally invert under .dark (so a
      // button stays readable against its own background) — fine for a
      // button, wrong for a panel whose whole design is "always reads as
      // a dark console." Pinned here to their light-mode values (dark
      // navy / near-white) so every existing bg-primary /
      // text-primary-foreground / primary-foreground/NN% usage below
      // keeps working unchanged, regardless of the surrounding page's
      // theme.
      style={{ "--primary": "oklch(0.22 0.035 260)", "--primary-foreground": "oklch(0.98 0.004 250)" } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
          <p className="font-mono text-xs font-medium tracking-[0.15em] text-primary-foreground/70 uppercase">
            {data.client.business_name}
          </p>
        </div>
        <span className="font-mono text-[11px] tracking-wide text-primary-foreground/40 uppercase">
          Real account data — not illustrative
        </span>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-white/10 bg-primary-foreground/[0.03] px-3 py-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                active ? "bg-primary-foreground/10 text-primary-foreground" : "text-primary-foreground/50 hover:text-primary-foreground/80"
              }`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-5 md:p-6">
        {tab === "overview" && <OverviewTab data={data} />}
        {tab === "predictions" && <PredictionsTab data={data} />}
        {tab === "automations" && <AutomationsTab data={data} />}
      </div>
    </div>
  );
}
