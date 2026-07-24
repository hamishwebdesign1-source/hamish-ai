import { TrendingDown, TrendingUp } from "lucide-react";
import type { Kpi } from "@/lib/analytics-data";

function Sparkline({ data, trendDirection }: { data: number[]; trendDirection: "up" | "down" }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 28;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-full" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={trendDirection === "up" ? "var(--chart-2)" : "var(--chart-5)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KpiCard({ kpi, compact = false }: { kpi: Kpi; compact?: boolean }) {
  const TrendIcon = kpi.trendDirection === "up" ? TrendingUp : TrendingDown;

  return (
    <div className="card-interactive rounded-xl border border-border bg-background p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {kpi.label}
        </p>
        <span
          className={`flex items-center gap-1 font-mono text-xs font-medium ${
            kpi.isGoodTrend ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
          }`}
        >
          <TrendIcon className="size-3.5" />
          {kpi.trendValue}
        </span>
      </div>
      <p className="mt-2 font-heading text-2xl font-semibold tabular-nums">{kpi.value}</p>
      {!compact && (
        <div className="mt-3">
          <Sparkline data={kpi.sparkline} trendDirection={kpi.trendDirection} />
        </div>
      )}
    </div>
  );
}
