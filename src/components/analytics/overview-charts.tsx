"use client";

import { weeklyTrend, funnelSteps, leadSources } from "@/lib/analytics-data";

// Fixed categorical order for this dashboard's dark panel — chart-1 is too
// close in lightness to the panel background to read, and chart-3 is
// reserved for status (success) elsewhere, so identity work here draws from
// chart-2 / chart-4 / chart-5 only, in that order, every time.
const CATEGORICAL = ["var(--chart-2)", "var(--chart-4)", "var(--chart-5)"];
const NEUTRAL = "oklch(0.7 0.01 260 / 40%)";

// Indexed to 100 at week 1 so revenue (£) and bookings (count) can share one
// axis honestly — plotting their raw units together would invent a false
// correlation from two arbitrary scales.
export function TrendChart() {
  const width = 400;
  const height = 132;
  const plotBottom = 100;
  const plotTop = 10;

  const base = weeklyTrend[0];
  const series = [
    {
      id: "revenue",
      label: "Revenue",
      color: CATEGORICAL[0],
      values: weeklyTrend.map((w) => (w.revenue / base.revenue) * 100),
    },
    {
      id: "bookings",
      label: "Bookings",
      color: CATEGORICAL[1],
      values: weeklyTrend.map((w) => (w.bookings / base.bookings) * 100),
    },
  ];

  const allValues = series.flatMap((s) => s.values);
  const min = Math.min(100, ...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const n = weeklyTrend.length;
  const xFor = (i: number) => (i / (n - 1)) * width;
  const yFor = (v: number) => plotBottom - ((v - min) / range) * (plotBottom - plotTop);

  return (
    <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">
          Growth since week 1 (indexed)
        </p>
        <ul className="flex items-center gap-3">
          {series.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5 text-[11px] text-primary-foreground/60">
              <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-36 w-full" preserveAspectRatio="none">
        <line
          x1="0"
          y1={yFor(100)}
          x2={width}
          y2={yFor(100)}
          stroke="currentColor"
          strokeWidth="1"
          className="text-primary-foreground/15"
        />
        {series.map((s) => {
          const points = s.values.map((v, i) => ({ x: xFor(i), y: yFor(v) }));
          const line = points.map((p) => `${p.x},${p.y}`).join(" ");
          const last = points[points.length - 1];
          return (
            <g key={s.id}>
              <polyline
                points={line}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx={last.x} cy={last.y} r="4" fill={s.color} stroke="var(--primary)" strokeWidth="2" />
            </g>
          );
        })}
      </svg>

      <div className="mt-1 flex items-center justify-between text-[10px] text-primary-foreground/40">
        <span>{weeklyTrend[0].week}</span>
        <div className="flex gap-4">
          {series.map((s) => {
            const growth = Math.round(s.values[s.values.length - 1] - 100);
            return (
              <span key={s.id} className="font-mono" style={{ color: s.color }}>
                {growth >= 0 ? "+" : ""}
                {growth}%
              </span>
            );
          })}
        </div>
        <span>{weeklyTrend[weeklyTrend.length - 1].week}</span>
      </div>
    </div>
  );
}

// Ordinal — the stages have a real, meaningful order, so this is one hue
// (chart-2) stepped by opacity rather than a categorical rainbow per stage.
export function ConversionFunnel() {
  const max = funnelSteps[0].value;
  const steps = [1, 0.8, 0.62, 0.46];

  return (
    <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
      <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">
        Conversion funnel
      </p>
      <div className="mt-4 space-y-3">
        {funnelSteps.map((step, i) => {
          const pct = (step.value / max) * 100;
          const prev = i > 0 ? funnelSteps[i - 1].value : null;
          const dropOff = prev ? Math.round(((prev - step.value) / prev) * 100) : null;
          return (
            <div key={step.label}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-primary-foreground/80">{step.label}</span>
                {dropOff !== null && (
                  <span className="text-[10px] text-primary-foreground/40">↓ {dropOff}% drop-off</span>
                )}
              </div>
              <div className="mt-1 flex h-3 w-full items-center rounded-sm bg-primary-foreground/10">
                <div
                  className="h-full"
                  style={{
                    width: `${pct}%`,
                    background: "var(--chart-2)",
                    opacity: steps[i] ?? 0.4,
                    borderRadius: "0 4px 4px 0",
                  }}
                />
                <span className="ml-2 shrink-0 font-mono text-[11px] tabular-nums text-primary-foreground/70">
                  {step.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Part-to-whole with only 4 buckets and close values — a bar reads at a
// glance; a donut would ask the reader to compare angles instead of lengths.
export function ChannelBreakdown() {
  const max = Math.max(...leadSources.map((s) => s.value));

  return (
    <div className="rounded-xl border border-white/10 bg-primary-foreground/5 p-5">
      <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/50 uppercase">
        Where leads come from
      </p>
      <div className="mt-4 space-y-2.5">
        {leadSources.map((s, i) => {
          const isOther = s.label.startsWith("Other");
          const color = isOther ? NEUTRAL : CATEGORICAL[i % CATEGORICAL.length];
          const pct = (s.value / max) * 100;
          return (
            <div key={s.label}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="flex items-center gap-1.5 text-primary-foreground/70">
                  <span className="size-2 rounded-full" style={{ background: color }} />
                  {s.label}
                </span>
                <span className="font-mono tabular-nums text-primary-foreground/50">{s.value}%</span>
              </div>
              <div className="mt-1 h-3 w-full rounded-sm bg-primary-foreground/10">
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, background: color, borderRadius: "0 4px 4px 0" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
