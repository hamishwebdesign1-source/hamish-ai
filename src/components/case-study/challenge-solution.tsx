import { CircleCheckBig, X } from "lucide-react";
import type { CaseStudy } from "@/lib/case-studies-data";

export function ChallengeSolution({ study }: { study: CaseStudy }) {
  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid overflow-hidden rounded-2xl border border-border md:grid-cols-2">
        <div className="bg-secondary/60 p-8 md:p-10">
          <p className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Before
          </p>
          <h2 className="mt-1 font-heading text-2xl font-semibold md:text-3xl">
            The Challenge
          </h2>
          <ul className="mt-6 space-y-4">
            {study.challenge.map((c) => (
              <li key={c} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <X className="size-3.5" />
                </span>
                <span className="text-muted-foreground">{c}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-accent/10 p-8 md:p-10">
          <p className="font-mono text-xs font-medium tracking-wide text-accent uppercase">After</p>
          <h2 className="mt-1 font-heading text-2xl font-semibold md:text-3xl">
            The Solution
          </h2>
          <ul className="mt-6 space-y-4">
            {study.solution.map((s) => (
              <li key={s} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <CircleCheckBig className="size-3.5" />
                </span>
                <span className="text-foreground">{s}</span>
              </li>
            ))}
          </ul>
        </div>
        </div>
      </div>
    </section>
  );
}
