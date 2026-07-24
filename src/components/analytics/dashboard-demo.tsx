"use client";

import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/eyebrow";
import { KpiCard } from "@/components/analytics/kpi-card";
import { dashboardKpis, trafficByDay, aiInsights } from "@/lib/analytics-data";

const INSIGHTS_SHOWN = 3;

export function DashboardDemo() {
  const [offset, setOffset] = useState(0);

  const visibleInsights = Array.from({ length: INSIGHTS_SHOWN }, (_, i) => aiInsights[(offset + i) % aiInsights.length]);
  const maxTraffic = Math.max(...trafficByDay.data.map((d) => d.value));

  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-4 shadow-2xl shadow-accent/10 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow pulse>Live interactive demo</Eyebrow>
        <span className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          Illustrative example — fictional data
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardKpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-5">
          <p className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {trafficByDay.label}
          </p>
          <div className="mt-5 flex h-40 items-end gap-3">
            {trafficByDay.data.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-sm bg-accent/80 transition-all"
                  style={{ height: `${(d.value / maxTraffic) * 100}%` }}
                  title={`${d.day}: ${d.value} visits`}
                />
                <span className="font-mono text-[11px] text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 font-mono text-xs font-medium tracking-wide text-accent uppercase">
              <Sparkles className="size-3.5" />
              AI insights
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setOffset((o) => (o + INSIGHTS_SHOWN) % aiInsights.length)}
            >
              <RefreshCw className="size-3.5" />
              Regenerate
            </Button>
          </div>
          <ul className="mt-4 space-y-3">
            {visibleInsights.map((insight) => (
              <li
                key={insight.id}
                className="rounded-lg bg-secondary/50 px-3.5 py-3 text-sm text-foreground"
              >
                {insight.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
