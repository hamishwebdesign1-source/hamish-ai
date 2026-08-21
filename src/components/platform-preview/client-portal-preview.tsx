import { TrendingUp, Building2, Lightbulb, Activity } from "lucide-react";

// AI Website Creation Guide sibling work, /platform hero rebuild —
// section 05 from the brief ("the client experiences the agency's
// brand"). Deliberately styled in --clay (the site's existing warm
// terracotta token, not a new colour) rather than --accent's blue —
// the whole point of this mockup is to visually demonstrate that a
// client's portal carries the AGENCY's brand, not HamishAI's, so it
// needs to look like a genuinely different, unrelated brand from the
// Command Centre panel in the hero above. Illustrative data only, same
// convention as the hero panel.

const clientMetrics = [
  { label: "Website leads", value: "+38%", positive: true },
  { label: "Qualified opportunities", value: "24", positive: null },
  { label: "Conversion rate", value: "7.8%", positive: null },
  { label: "AI opportunities", value: "12", positive: null },
];

const leadTrend = [4, 6, 5, 8, 7, 11, 9, 13, 12, 16, 15, 19];

const recommendations = ["Add a booking widget to the homepage — 3 enquiries lost to slow response last month", "Enable the AI receptionist out of hours — 22% of enquiries arrive after 6pm"];

const recentActivity = [
  { label: "New enquiry received", detail: "Contact form, 2 hours ago" },
  { label: "Monthly report generated", detail: "October performance" },
];

function Sparkline({ data }: { data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 32;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-full" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="var(--clay)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ClientPortalPreview() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-border bg-background shadow-xl shadow-black/5">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3" style={{ backgroundColor: "var(--clay-soft)" }}>
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg text-white" style={{ backgroundColor: "var(--clay)" }}>
            <Building2 className="size-3.5" />
          </span>
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--clay)" }}>
              Coastal Practice Group
            </p>
            <p className="text-[10px] text-muted-foreground">Client portal</p>
          </div>
        </div>
        <span className="font-mono text-[9px] tracking-wide text-muted-foreground uppercase">Illustrative example</span>
      </div>

      <div className="p-4 md:p-5">
        <p className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground uppercase">Client performance</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {clientMetrics.map((m) => (
            <div key={m.label} className="rounded-lg border border-border p-2.5">
              <p className={`font-heading text-base font-semibold tabular-nums ${m.positive ? "text-success" : "text-foreground"}`}>{m.value}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
              <TrendingUp className="size-3" style={{ color: "var(--clay)" }} /> Lead trend, 12 weeks
            </p>
          </div>
          <div className="mt-2">
            <Sparkline data={leadTrend} />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
              <Lightbulb className="size-3" /> Recommendations
            </p>
            <ul className="mt-2 space-y-2">
              {recommendations.map((r) => (
                <li key={r} className="text-[11px] leading-snug text-muted-foreground">
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
              <Activity className="size-3" /> Recent activity
            </p>
            <ul className="mt-2 space-y-2">
              {recentActivity.map((a) => (
                <li key={a.label} className="text-[11px] leading-snug">
                  <span className="text-foreground">{a.label}</span>
                  <span className="block text-muted-foreground">{a.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
