import type { CaseStudy } from "@/lib/case-studies-data";

export function StatsGrid({ study }: { study: CaseStudy }) {
  return (
    <section className="border-t border-border/60 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <h2 className="font-heading text-2xl font-semibold md:text-3xl">
          Illustrative results
        </h2>
        <p className="mt-2 max-w-lg text-primary-foreground/70">
          Concept demonstration — figures are illustrative of the kind of
          impact these AI features typically deliver, not real client data.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {study.stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-5"
              >
                <Icon className="size-5 text-primary-foreground/60" />
                <p className="mt-3 font-heading text-3xl font-semibold">{s.value}</p>
                <p className="mt-1 text-sm text-primary-foreground/70">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
