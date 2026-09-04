"use client";

import Link from "next/link";
import { ArrowUp, ArrowDown, Database, CheckCircle2, Circle, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/platform/help-tip";
import { AnalyticsChart } from "@/components/platform/analytics-chart";
import { Reveal } from "@/components/reveal";
import { CountUp } from "@/components/platform/count-up";
import { StudioPageHeader } from "@/components/platform/studio-page-header";
import type { AnalyticsData, AnalyticsRange, Kpi } from "@/lib/studio-analytics";
import { RANGE_LABELS, percentChange } from "@/lib/studio-analytics";
import { buildAnalyticsCsv } from "@/lib/analytics-csv";

const RANGES: AnalyticsRange[] = ["7d", "30d", "90d", "12m"];

const KPI_EXPLANATIONS: Record<string, string> = {
  Revenue: "Paid invoices to your own clients within this period — real Stripe payment data, not an estimate.",
  "New prospects": "Businesses your discovery searches found, created within this period.",
  "New clients": "Prospects you converted to clients within this period.",
  "Requests handled": "Client requests you replied to within this period.",
};

function KpiCard({ kpi }: { kpi: Kpi }) {
  const change = percentChange(kpi.value, kpi.previousValue);
  return (
    <Card>
      <CardContent>
        <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          {kpi.label}
          {KPI_EXPLANATIONS[kpi.label] && <HelpTip explanation={KPI_EXPLANATIONS[kpi.label]} />}
        </p>
        <p className="mt-2 font-heading text-2xl font-semibold tabular-nums">
          {/* Same CountUp/Reveal treatment as Command Centre's own stat
              cards (command-centre-stat-cards.tsx) — see reveal.tsx's
              comment for why this is scoped to numeric KPI surfaces only,
              not every /studio route. Money KPIs are stored in pence
              (studio-analytics.ts), same £-prefix-on-a-rounded-pounds-
              value convention as pipeline value's own CountUp there. */}
          {kpi.format === "money" ? <CountUp value={Math.round(kpi.value / 100)} prefix="£" /> : <CountUp value={kpi.value} />}
        </p>
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

// Studio improvement — client-side only, no new query: buildAnalyticsCsv()
// already has every number this page renders. A plain <a download> click
// (no server round-trip, no route) is the standard browser-native export
// pattern, same as any other client-side file download.
function downloadCsv(data: AnalyticsData) {
  const csv = buildAnalyticsCsv(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `studio-analytics-${data.range}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AnalyticsPanel({ data }: { data: AnalyticsData }) {
  return (
    <div className="mx-auto max-w-5xl">
      <StudioPageHeader
        eyebrow="Grow"
        title="Analytics"
        description="Real numbers from your own account — no illustrative data."
        actions={
          <>
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
            <Button size="sm" variant="outline" onClick={() => downloadCsv(data)}>
              <Download className="size-3.5" /> Download CSV
            </Button>
          </>
        }
      />

      <Reveal className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </Reveal>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent>
            <p className="text-sm font-semibold">Revenue over time</p>
            <AnalyticsChart
              series={data.revenueSeries}
              forecast={data.revenueForecast}
              kind="area"
              format="money"
              height={224}
              emptyMessage={
                <>
                  No paid invoices in this period yet — this fills in once you invoice clients from{" "}
                  <Link href="/studio/clients" className="text-accent underline underline-offset-2">
                    Clients
                  </Link>
                  .
                </>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm font-semibold">Prospects found over time</p>
            <AnalyticsChart
              series={data.prospectsSeries}
              kind="bar"
              format="count"
              height={224}
              emptyMessage={
                <>
                  No prospects found in this period —{" "}
                  <Link href="/studio/prospects" className="text-accent underline underline-offset-2">
                    run a discovery search
                  </Link>
                  .
                </>
              }
            />
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
