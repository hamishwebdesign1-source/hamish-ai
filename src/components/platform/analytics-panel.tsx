"use client";

import Link from "next/link";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ArrowUp, ArrowDown, Database, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpTip } from "@/components/platform/help-tip";
import type { AnalyticsData, AnalyticsRange, Kpi } from "@/lib/studio-analytics";
import { RANGE_LABELS, percentChange } from "@/lib/studio-analytics";

const RANGES: AnalyticsRange[] = ["7d", "30d", "90d", "12m"];

const KPI_EXPLANATIONS: Record<string, string> = {
  Revenue: "Paid invoices to your own clients within this period — real Stripe payment data, not an estimate.",
  "New prospects": "Businesses your discovery searches found, created within this period.",
  "New clients": "Prospects you converted to clients within this period.",
  "Requests handled": "Client requests you replied to within this period.",
};

function formatKpiValue(kpi: Kpi) {
  if (kpi.format === "money") return `£${(kpi.value / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
  return kpi.value.toLocaleString("en-GB");
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const change = percentChange(kpi.value, kpi.previousValue);
  return (
    <Card>
      <CardContent>
        <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          {kpi.label}
          {KPI_EXPLANATIONS[kpi.label] && <HelpTip explanation={KPI_EXPLANATIONS[kpi.label]} />}
        </p>
        <p className="mt-2 font-heading text-2xl font-semibold tabular-nums">{formatKpiValue(kpi)}</p>
        {change ? (
          <p
            className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${
              change.direction === "up" ? "text-accent" : change.direction === "down" ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {change.direction === "up" && <ArrowUp className="size-3" />}
            {change.direction === "down" && <ArrowDown className="size-3" />}
            {change.pct}% vs previous period
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">No activity in the previous period to compare</p>
        )}
      </CardContent>
    </Card>
  );
}

// A custom tooltip rather than Recharts' default — the default doesn't
// pick up this app's own typography/tokens, and a mismatched tooltip is
// exactly the kind of "decorative chart" seam the brief explicitly asked
// to avoid.
function ChartTooltip({ active, payload, label, formatValue }: { active?: boolean; payload?: { value: number }[]; label?: string; formatValue: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-muted-foreground">{formatValue(payload[0].value)}</p>
    </div>
  );
}

export function AnalyticsPanel({ data }: { data: AnalyticsData }) {
  const hasRevenue = data.revenueSeries.some((p) => p.value > 0);
  const hasProspects = data.prospectsSeries.some((p) => p.value > 0);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold md:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Real numbers from your own account — no illustrative data.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-secondary/40 p-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/studio/analytics?range=${r}`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                r === data.range ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {RANGE_LABELS[r]}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent>
            <p className="text-sm font-semibold">Revenue over time</p>
            {hasRevenue ? (
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.revenueSeries} margin={{ left: -20, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `£${v}`} />
                    <Tooltip content={<ChartTooltip formatValue={(v) => `£${v.toLocaleString("en-GB")}`} />} />
                    <Area type="monotone" dataKey="value" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#revenueFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-8 mb-8 text-center text-sm text-muted-foreground">
                No paid invoices in this period yet — this fills in once you invoice clients from{" "}
                <Link href="/studio/clients" className="text-accent underline underline-offset-2">
                  Clients
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm font-semibold">Prospects found over time</p>
            {hasProspects ? (
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.prospectsSeries} margin={{ left: -20, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip formatValue={(v) => `${v}`} />} />
                    <Bar dataKey="value" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-8 mb-8 text-center text-sm text-muted-foreground">
                No prospects found in this period —{" "}
                <Link href="/studio/prospects" className="text-accent underline underline-offset-2">
                  run a discovery search
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="font-heading text-sm font-semibold">Data sources</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          What this page&apos;s numbers come from — connect more sources as they become available.
        </p>
        <div className="mt-3 space-y-2">
          <Card>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2.5">
                <Database className="size-4 text-accent" />
                <div>
                  <p className="text-sm font-medium">Platform data</p>
                  <p className="text-xs text-muted-foreground">Prospects, clients, requests, invoices — always current.</p>
                </div>
              </div>
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="size-3" /> Connected
              </Badge>
            </CardContent>
          </Card>
          {["Google Analytics", "CRM", "CSV upload"].map((name) => (
            <Card key={name}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2.5">
                  <Circle className="size-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">{name}</p>
                </div>
                <Badge variant="secondary">Not connected</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
