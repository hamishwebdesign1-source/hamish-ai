// Real-data charts for the portal Insights page — deliberately built from
// what we actually know about a client's account (their requests, their
// site checks, their invoices), never fabricated business KPIs. Styled to
// match the AI Command Centre's dark-panel language from the marketing
// site's /analytics demo, so the visual experience is continuous between
// the sales pitch and the delivered product — only the honesty level of
// the underlying data differs (this is real, that's illustrative).

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
            <span className="font-mono text-[10px] tabular-nums text-primary-foreground/60">
              {formatValue ? formatValue(d.value) : d.value}
            </span>
            <div className="w-full rounded-t-md bg-primary-foreground/10" style={{ height: "100%", position: "relative" }}>
              <div
                className="absolute right-0 bottom-0 left-0 rounded-t-md"
                style={{ height: `${heightPct}%`, background: TONE_COLOR[d.tone ?? "default"] }}
              />
            </div>
            <span className="text-[10px] whitespace-nowrap text-primary-foreground/50">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function UptimeBar({ checks }: { checks: { checked_at: string; uptime_ok: boolean | null; response_ms: number | null }[] }) {
  const bars: Bar[] = checks
    .slice(0, 10)
    .reverse()
    .map((c) => ({
      label: new Date(c.checked_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      value: c.response_ms ?? 0,
      tone: c.uptime_ok === false ? "warning" : "default",
    }));

  return (
    <div>
      <p className="font-mono text-[11px] font-medium tracking-wide text-primary-foreground/50 uppercase">
        Response time per check (ms)
      </p>
      <div className="mt-4">
        <VerticalBarChart data={bars} formatValue={(v) => `${v}`} />
      </div>
    </div>
  );
}

export function uptimePercent(checks: { uptime_ok: boolean | null }[]): number | null {
  const withResult = checks.filter((c) => c.uptime_ok !== null);
  if (!withResult.length) return null;
  const upCount = withResult.filter((c) => c.uptime_ok).length;
  return Math.round((upCount / withResult.length) * 100);
}
