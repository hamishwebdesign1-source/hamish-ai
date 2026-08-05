import type { CaseStudy } from "@/lib/case-studies-data";

export function ChallengeSolution({ study }: { study: CaseStudy }) {
  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid overflow-hidden rounded-2xl border border-border md:grid-cols-2 md:divide-x md:divide-border">
          <div className="p-8 md:p-10">
            <p className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Before
            </p>
            <h2 className="mt-1 font-heading text-2xl font-semibold md:text-3xl">
              The Challenge
            </h2>
            <ul className="mt-6 space-y-4">
              {study.challenge.map((c) => (
                <li key={c} className="border-l-2 border-destructive/40 py-0.5 pl-4 text-muted-foreground">
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-8 md:p-10">
            <p
              className="font-mono text-xs font-medium tracking-wide uppercase"
              style={{ color: study.accentTo }}
            >
              After
            </p>
            <h2 className="mt-1 font-heading text-2xl font-semibold md:text-3xl">
              The Solution
            </h2>
            <ul className="mt-6 space-y-4">
              {study.solution.map((s) => (
                <li
                  key={s}
                  className="border-l-2 py-0.5 pl-4 text-foreground"
                  style={{ borderColor: study.accentTo }}
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
