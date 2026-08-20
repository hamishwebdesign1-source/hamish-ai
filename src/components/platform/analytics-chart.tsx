"use client";

import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { ChartPoint } from "@/lib/studio-analytics";

// Extracted from analytics-panel.tsx (Command Centre Phase 5c) so the
// Analytics page and a Command Centre chart block render from one real
// implementation, not two copies that could drift — same Recharts setup,
// same custom tooltip (still not Recharts' default, which doesn't pick
// up this app's own typography/tokens), same "no fake data" empty state.
function ChartTooltip({ active, payload, label, formatValue }: { active?: boolean; payload?: { value: number }[]; label?: string; formatValue: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-muted-foreground">{formatValue(payload[0].value)}</p>
    </div>
  );
}

export function AnalyticsChart({
  series,
  kind,
  format,
  emptyMessage,
  height = 224,
}: {
  series: ChartPoint[];
  kind: "area" | "bar";
  format: "money" | "count";
  emptyMessage: React.ReactNode;
  height?: number;
}) {
  const hasData = series.some((p) => p.value > 0);
  const formatValue = (v: number) => (format === "money" ? `£${v.toLocaleString("en-GB")}` : `${v}`);

  if (!hasData) {
    return <p className="mt-8 mb-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="mt-4" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "area" ? (
          <AreaChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="analyticsChartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v) => (format === "money" ? `£${v}` : `${v}`)}
            />
            <Tooltip content={<ChartTooltip formatValue={formatValue} />} />
            <Area type="monotone" dataKey="value" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#analyticsChartFill)" />
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
    </div>
  );
}
