"use client";

import { useEffect, useRef, useState } from "react";
import { forecast, whatIfLevers, whatIfBaseline, demandHeatmap } from "@/lib/analytics-data";

function useAnimatedNumber(target: number) {
  const [value, setValue] = useState(target);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    const start = value;
    const startTime = performance.now();
    const duration = 500;

    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + (target - start) * eased);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

function ForecastChart() {
  const width = 400;
  const height = 100;
  const actualCount = 3;
  const path = forecast.path;
  const min = Math.min(...path);
  const max = Math.max(...path);
  const range = max - min || 1;

  const points = path.map((v, i) => ({
    x: (i / (path.length - 1)) * width,
    y: height - ((v - min) / range) * height,
  }));

  const toPolyline = (pts: typeof points) => pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full" preserveAspectRatio="none">
      <polyline
        points={toPolyline(points.slice(0, actualCount))}
        fill="none"
        stroke="var(--chart-2)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={toPolyline(points.slice(actualCount - 1))}
        fill="none"
        stroke="var(--chart-2)"
        strokeWidth="2.5"
        strokeDasharray="6 5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
      <line
        x1={points[actualCount - 1].x}
        y1="0"
        x2={points[actualCount - 1].x}
        y2={height}
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 4"
        className="text-primary-foreground/20"
      />
    </svg>
  );
}

function WhatIfSimulator() {
  const [active, setActive] = useState<string[]>([]);

  const combinedEffect = whatIfLevers
    .filter((l) => active.includes(l.id))
    .reduce(
      (acc, l) => ({
        revenue: acc.revenue + l.effect.revenue,
        leads: acc.leads + l.effect.leads,
        bookings: acc.bookings + l.effect.bookings,
      }),
      { revenue: 0, leads: 0, bookings: 0 }
    );

  const projectedRevenue = useAnimatedNumber(whatIfBaseline.revenue * (1 + combinedEffect.revenue));
  const projectedLeads = useAnimatedNumber(whatIfBaseline.leads * (1 + combinedEffect.leads));
  const projectedBookings = useAnimatedNumber(whatIfBaseline.bookings * (1 + combinedEffect.bookings));

  function toggle(id: string) {
    setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }

  return (
    <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
      <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">
        What-if simulator
      </p>
      <p className="mt-1 text-xs text-primary-foreground/50">
        Illustrative model, not a live forecast — toggle levers to see the projected effect.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {whatIfLevers.map((lever) => {
          const isActive = active.includes(lever.id);
          return (
            <button
              key={lever.id}
              type="button"
              onClick={() => toggle(lever.id)}
              title={lever.description}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-accent bg-accent/20 text-primary-foreground"
                  : "border-white/15 text-primary-foreground/60 hover:text-primary-foreground"
              }`}
            >
              {lever.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
        <div>
          <p className="font-mono text-[10px] tracking-wide text-primary-foreground/40 uppercase">Revenue</p>
          <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
            £{Math.round(projectedRevenue).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-wide text-primary-foreground/40 uppercase">Leads</p>
          <p className="mt-1 font-heading text-xl font-semibold tabular-nums">{Math.round(projectedLeads)}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-wide text-primary-foreground/40 uppercase">Bookings</p>
          <p className="mt-1 font-heading text-xl font-semibold tabular-nums">{Math.round(projectedBookings)}</p>
        </div>
      </div>
    </div>
  );
}

function DemandHeatmap() {
  const allValues = demandHeatmap.data.flatMap((d) => d.slots);
  const max = Math.max(...allValues);

  return (
    <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
      <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">
        Demand heat map
      </p>
      <div className="mt-4 grid grid-cols-[auto_repeat(4,1fr)] gap-1.5 text-center">
        <div />
        {demandHeatmap.dayparts.map((d) => (
          <p key={d} className="text-[10px] text-primary-foreground/50">
            {d}
          </p>
        ))}
        {demandHeatmap.data.map((row) => (
          <div key={row.day} className="contents">
            <p className="flex items-center pr-2 text-[11px] text-primary-foreground/60">{row.day}</p>
            {row.slots.map((value, i) => (
              <div
                key={i}
                title={`${row.day} ${demandHeatmap.dayparts[i]}: ${value}`}
                className="aspect-square rounded-md"
                style={{ backgroundColor: `color-mix(in oklch, var(--chart-2) ${(value / max) * 100}%, transparent)` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PredictionsPanel() {
  return (
    <div className="tab-panel-enter space-y-6">
      <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">
            Revenue forecast — {forecast.horizon}
          </p>
          <p className="text-xs text-primary-foreground/50">{forecast.confidenceRange}</p>
        </div>
        <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">{forecast.projected}</p>
        <div className="mt-3">
          <ForecastChart />
        </div>
      </div>

      <WhatIfSimulator />
      <DemandHeatmap />
    </div>
  );
}
