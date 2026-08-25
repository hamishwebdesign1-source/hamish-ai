import type { LucideIcon } from "lucide-react";
import { CountUp } from "@/components/platform/count-up";

// The Command Centre's new masthead — deliberately not a configurable
// block (command-centre-layout.ts's block canvas is for an agency's own
// stat/chart preferences; this is the one thing every visit opens with,
// not something to hide). Every number here is a delta or an urgent
// count already computed by page.tsx for the briefing/actions-required
// sections below — no new query, this is a second, more prominent read
// of numbers that already exist, framed around "what's new/due today"
// rather than the block canvas's all-time totals (prospects found,
// clients total). That distinction is deliberate: a masthead repeating
// the same all-time counts every single day would go stale fast.
export type TodayStat = {
  id: string;
  value: number;
  label: string;
  icon: LucideIcon;
  prefix?: string;
  tone?: "default" | "urgent";
};

export function TodayStrip({ stats }: { stats: TodayStat[] }) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border/60 bg-secondary/30 px-5 py-2.5">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
        </span>
        <span className="font-mono text-[11px] font-medium tracking-[0.15em] text-muted-foreground uppercase">Today</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-border/60 sm:grid-cols-4 sm:divide-y-0">
        {stats.map((stat) => (
          <div key={stat.id} className="flex items-center gap-3 px-5 py-4">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                stat.tone === "urgent" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"
              }`}
            >
              <stat.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-heading text-xl font-semibold tabular-nums">
                <CountUp value={stat.value} prefix={stat.prefix} />
              </p>
              <p className="truncate text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
