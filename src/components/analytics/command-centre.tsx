"use client";

import { useState } from "react";
import { LayoutDashboard, MessageSquare, TrendingUp, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HealthRing } from "@/components/analytics/health-ring";
import { CopilotPanel } from "@/components/analytics/copilot-panel";
import { PredictionsPanel } from "@/components/analytics/predictions-panel";
import { AutomationsPanel } from "@/components/analytics/automations-panel";
import { healthScore, momentumMetrics, aiInsights, executiveBriefing } from "@/lib/analytics-data";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "copilot", label: "AI Copilot", icon: MessageSquare },
  { id: "predictions", label: "Predictions", icon: TrendingUp },
  { id: "automations", label: "Automations", icon: Zap },
] as const;

type TabId = (typeof TABS)[number]["id"];

const INSIGHTS_SHOWN = 3;

const severityStyles: Record<string, string> = {
  success: "border-l-emerald-400",
  warning: "border-l-amber-400",
  info: "border-l-[var(--chart-4)]",
};

function OverviewTab() {
  const [offset, setOffset] = useState(0);
  const visibleInsights = Array.from(
    { length: INSIGHTS_SHOWN },
    (_, i) => aiInsights[(offset + i) % aiInsights.length]
  );

  return (
    <div className="tab-panel-enter" key="overview">
      <div className="flex flex-col items-center gap-6 border-b border-white/10 pb-8 text-center sm:flex-row sm:text-left">
        <HealthRing
          score={healthScore.score}
          size={140}
          strokeWidth={10}
          centerLabel={`${healthScore.score}`}
          centerSublabel="AI Health Score"
        />
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.15em] text-primary-foreground/50 uppercase">
            Executive briefing
          </p>
          <p className="mt-2 max-w-xl font-heading text-lg leading-snug text-primary-foreground/90 md:text-xl">
            {executiveBriefing}
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {momentumMetrics.map((m) => (
          <div
            key={m.id}
            className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-primary-foreground/5 p-4 text-center"
          >
            <HealthRing score={m.score} size={64} strokeWidth={6} centerLabel={`${m.score}`} />
            <p className="text-xs font-medium text-primary-foreground/80">{m.label}</p>
            <p className="font-mono text-[11px] text-emerald-400">{m.trendValue}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">
            Living insights
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 px-2 text-xs text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={() => setOffset((o) => (o + INSIGHTS_SHOWN) % aiInsights.length)}
          >
            <RefreshCw className="size-3.5" />
            Refresh insights
          </Button>
        </div>
        <ul className="mt-4 space-y-3">
          {visibleInsights.map((insight) => (
            <li
              key={insight.id}
              className={`feed-item-enter rounded-lg border-l-4 bg-primary-foreground/5 px-4 py-3 ${severityStyles[insight.severity]}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm text-primary-foreground">
                  <span className="mr-1.5">{insight.emoji}</span>
                  {insight.text}
                </p>
                <span className="shrink-0 font-mono text-[10px] tracking-wide text-primary-foreground/40 uppercase">
                  {insight.confidence}% confidence
                </span>
              </div>
              <p className="mt-1.5 text-xs text-primary-foreground/60">
                → {insight.recommendation}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function CommandCentre() {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-primary text-primary-foreground shadow-2xl shadow-accent/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
          <p className="font-mono text-xs font-medium tracking-[0.15em] text-primary-foreground/70 uppercase">
            AI Command Centre
          </p>
        </div>
        <span className="font-mono text-[11px] tracking-wide text-primary-foreground/40 uppercase">
          Illustrative example — fictional data
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
                active
                  ? "bg-primary-foreground/10 text-primary-foreground"
                  : "text-primary-foreground/50 hover:text-primary-foreground/80"
              }`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-5 md:p-6">
        {tab === "overview" && <OverviewTab />}
        {tab === "copilot" && <CopilotPanel />}
        {tab === "predictions" && <PredictionsPanel />}
        {tab === "automations" && <AutomationsPanel />}
      </div>
    </div>
  );
}
