// Real-data charts for the portal Insights page — deliberately built from
// what we actually know about a client's account (their requests, their
// site checks, their invoices), never fabricated business KPIs. See the
// dataviz conventions used elsewhere on the site: bars for magnitude,
// single hue unless the series are genuinely distinct categories, rounded
// data-end only, a legend whenever there's more than one series.

type Bar = { label: string; value: number; tone?: "default" | "warning" };

const TONE_COLOR: Record<string, string> = {
  default: "var(--chart-2)",
  warning: "var(--warning)",
};

export function VerticalBarChart({ data, formatValue }: { data: Bar[]; formatValue?: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-2" style={{ height: 140 }}>
      {data.map((d) => {
        const heightPct = (d.value / max) * 100;
        return (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {formatValue ? formatValue(d.value) : d.value}
            </span>
            <div
              className="w-full rounded-t-md bg-secondary"
              style={{ height: "100%", position: "relative" }}
            >
              <div
                className="absolute right-0 bottom-0 left-0 rounded-t-md"
                style={{ height: `${heightPct}%`, background: TONE_COLOR[d.tone ?? "default"] }}
              />
            </div>
            <span className="text-[10px] whitespace-nowrap text-muted-foreground">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function UptimeBar({ checks }: { checks: { checked_at: string; uptime_ok: boolean | null; response_ms: number | null }[] }) {
  const withResult = checks.filter((c) => c.uptime_ok !== null);
  const upCount = withResult.filter((c) => c.uptime_ok).length;
  const uptimePct = withResult.length ? Math.round((upCount / withResult.length) * 100) : null;

  const bars: Bar[] = checks
    .slice(0, 10)
    .reverse()
    .map((c, i) => ({
      label: new Date(c.checked_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      value: c.response_ms ?? 0,
      tone: c.uptime_ok === false ? "warning" : "default",
    }));

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">Response time per check (ms)</p>
        {uptimePct !== null && (
          <p className="text-sm font-medium">
            <span className={uptimePct === 100 ? "text-success" : "text-warning"}>{uptimePct}%</span>{" "}
            <span className="text-muted-foreground">uptime</span>
          </p>
        )}
      </div>
      <div className="mt-4">
        <VerticalBarChart data={bars} formatValue={(v) => `${v}`} />
      </div>
    </div>
  );
}
