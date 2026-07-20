import { TrendingDown, TrendingUp } from "lucide-react";
import type { CaseStudy } from "@/lib/case-studies-data";

export function StatsGrid({ study }: { study: CaseStudy }) {
  return (
    <section className="border-t border-border/60 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
          <p className="font-mono text-xs font-medium tracking-wide text-primary-foreground/70 uppercase">
            Results dashboard
          </p>
        </div>
        <h2 className="mt-2 font-heading text-2xl font-semibold md:text-3xl">
          Illustrative results
        </h2>
        <p className="mt-2 max-w-lg text-primary-foreground/70">
          Concept demonstration — figures are illustrative of the kind of
          impact these AI features typically deliver, not real client data.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {study.stats.map((s) => {
            const Icon = s.icon;
            const TrendIcon = s.value.startsWith("-")
              ? TrendingDown
              : s.value.startsWith("+")
                ? TrendingUp
                : null;
            return (
              <div
                key={s.label}
                className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-5"
              >
                <div className="flex items-center justify-between">
                  <Icon className="size-5 text-primary-foreground/60" />
                  {TrendIcon && <TrendIcon className="size-4 text-accent" />}
                </div>
                <p className="mt-3 font-heading text-3xl font-semibold tabular-nums">
                  {s.value}
                </p>
                <p className="mt-1 text-sm text-primary-foreground/70">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
