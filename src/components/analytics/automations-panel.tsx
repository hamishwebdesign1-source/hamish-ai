"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { automationEvents, funnelSteps } from "@/lib/analytics-data";

const WINDOW_SIZE = 5;
const TICK_MS = 3500;

function ActivityFeed() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const visible = Array.from({ length: WINDOW_SIZE }, (_, i) => {
    const idx = (tick + i) % automationEvents.length;
    return automationEvents[idx];
  });

  return (
    <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
        </span>
        <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">
          AI working right now
        </p>
      </div>
      <ul className="mt-4 space-y-2.5">
        {visible.map((event, i) => (
          <li
            key={`${event.id}-${tick}`}
            className="feed-item-enter flex items-start gap-3 rounded-lg bg-primary-foreground/5 px-3.5 py-2.5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm text-primary-foreground">{event.label}</p>
              <p className="text-xs text-primary-foreground/50">{event.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Funnel() {
  const max = funnelSteps[0]?.value || 1;

  return (
    <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
      <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">
        Conversion funnel
      </p>
      <div className="mt-4 space-y-3">
        {funnelSteps.map((step, i) => {
          const widthPct = (step.value / max) * 100;
          return (
            <div key={step.label}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary-foreground/70">{step.label}</span>
                <span className="font-mono tabular-nums text-primary-foreground/50">{step.value}</span>
              </div>
              <div className="mt-1 h-2.5 rounded-full bg-primary-foreground/10">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-700"
                  style={{ width: `${widthPct}%`, opacity: 1 - i * 0.15 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AutomationsPanel() {
  return (
    <div className="tab-panel-enter space-y-6">
      <ActivityFeed />
      <Funnel />
    </div>
  );
}
