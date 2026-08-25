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

// Dark card language throughout now (bg-primary/text-primary-foreground),
// matching Business Health rather than being the one light exception —
// direct instruction to replicate that card's style across the whole
// page.
export function TodayStrip({ stats }: { stats: TodayStat[] }) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl bg-primary text-primary-foreground">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
        </span>
        <span className="font-mono text-[11px] font-medium tracking-[0.15em] text-primary-foreground/60 uppercase">Today</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-4 sm:divide-y-0">
        {stats.map((stat) => (
          <div key={stat.id} className="flex items-center gap-3 px-5 py-4">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                stat.tone === "urgent" ? "bg-destructive/15 text-destructive" : "bg-white/10 text-accent"
              }`}
            >
              <stat.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-heading text-xl font-semibold tabular-nums">
                <CountUp value={stat.value} prefix={stat.prefix} />
              </p>
              {/* Wraps to a second line rather than truncate — a label
                  long enough to need it (an org-specific string down the
                  line, say) should be readable, not cut mid-word with an
                  ellipsis. Kept short deliberately in page.tsx anyway, so
                  this is a safety net, not the normal case. */}
              <p className="text-xs leading-tight text-primary-foreground/50">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
