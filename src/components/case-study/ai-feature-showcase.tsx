import type { CaseStudy } from "@/lib/case-studies-data";

export function AIFeatureShowcase({ study }: { study: CaseStudy }) {
  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="max-w-2xl">
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">
            What the AI actually does
          </h2>
          <p className="mt-2 text-muted-foreground">
            Try it for real in the demo above — here&apos;s what&apos;s
            happening behind each conversation.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {study.aiFeatures.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="card-interactive group rounded-xl border border-border bg-background p-6"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-heading text-lg font-medium">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
