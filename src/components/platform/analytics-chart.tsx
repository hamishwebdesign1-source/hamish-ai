"use client";

import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { ChartPoint, ForecastPoint } from "@/lib/studio-analytics";

// Extracted from analytics-panel.tsx (Command Centre Phase 5c) so the
// Analytics page and a Command Centre chart block render from one real
// implementation, not two copies that could drift — same Recharts setup,
// same custom tooltip (still not Recharts' default, which doesn't pick
// up this app's own typography/tokens), same "no fake data" empty state.
//
// Reads `dataKey` off each payload entry rather than assuming index 0 is
// the actual series — once a forecast overlay is present a hovered point
// can carry an actual entry, a forecast entry, or (right at the join)
// both, and the tooltip needs to show whichever one is real for that x.
function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: { value?: number; dataKey?: string }[];
  label?: string;
  formatValue: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const actual = payload.find((p) => p.dataKey === "value" && p.value != null);
  const projected = payload.find((p) => p.dataKey === "forecast" && p.value != null);
  const point = actual ?? projected;
  if (!point || point.value == null) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-muted-foreground">
        {formatValue(point.value)}
        {!actual && projected && <span className="ml-1 text-[10px] text-muted-foreground/70">(projected)</span>}
      </p>
    </div>
  );
}

export function AnalyticsChart({
  series,
  forecast,
  kind,
  format,
  emptyMessage,
  height = 224,
}: {
  series: ChartPoint[];
  // Revenue only, for now — see studio-analytics.ts's own comment on
  // projectSeries(). Ignored on a bar chart: a dashed projection reads
  // naturally as a line continuing, not as a bar that hasn't happened yet.
  forecast?: ForecastPoint[];
  kind: "area" | "bar";
  format: "money" | "count" | "percent";
  emptyMessage: React.ReactNode;
  height?: number;
}) {
  const hasData = series.some((p) => p.value > 0);
  const formatValue = (v: number) => (format === "money" ? `£${v.toLocaleString("en-GB")}` : format === "percent" ? `${v}%` : `${v}`);
  // projectSeries() returns the series unchanged (no `forecast` field at
  // all) whenever it didn't have enough real signal to project from — so
  // this is true only when a genuine projection exists, not just because
  // a `forecast` prop was passed.
  const hasForecast = kind === "area" && (forecast?.some((p) => p.forecast !== undefined && p.value === undefined) ?? false);
  // Widened to ForecastPoint[] either way — plain ChartPoints are already
  // structurally valid ForecastPoints (a required `value` satisfies an
  // optional one), so Recharts sees one consistent shape instead of a
  // union it can't reconcile.
  const chartData: ForecastPoint[] = hasForecast ? forecast! : series;

  if (!hasData) {
    return <p className="mt-8 mb-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="mt-4" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "area" ? (
          <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="analyticsChartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
              </linearGradient>
              {hasForecast && (
                <linearGradient id="analyticsChartForecastFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v) => (format === "money" ? `£${v}` : format === "percent" ? `${v}%` : `${v}`)}
            />
            <Tooltip content={<ChartTooltip formatValue={formatValue} />} />
            <Area type="monotone" dataKey="value" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#analyticsChartFill)" />
            {hasForecast && (
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="url(#analyticsChartForecastFill)"
              />
            )}
          </AreaChart>
        ) : (
          <BarChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
            <Tooltip content={<ChartTooltip formatValue={formatValue} />} />
            <Bar dataKey="value" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
      {hasForecast && (
        // No text-color utility here on purpose: this component renders
        // inside both a plain light Card (Analytics page) and the one
        // dark bg-primary card the Command Centre uses for every block
        // (see page.tsx's own comment on why) — `opacity-60` on the
        // inherited `color` matches whichever text-foreground/
        // text-primary-foreground the ancestor Card already set, the
        // same way every other dim label inside that dark card does it
        // (text-primary-foreground/50, /60, /70), rather than assuming
        // one specific surface.
        <p className="mt-2 text-center text-[11px] opacity-60">
          Dashed = projected, a straight-line trend from your last {series.length} real periods — not AI-generated.
        </p>
      )}
    </div>
  );
}
