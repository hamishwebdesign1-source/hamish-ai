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
        <div className="mt-10 grid gap-x-10 gap-y-10 md:grid-cols-2">
          {study.aiFeatures.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="border-t pt-6" style={{ borderColor: study.accentFrom }}>
                <Icon className="size-7" style={{ color: study.accentFrom }} />
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
