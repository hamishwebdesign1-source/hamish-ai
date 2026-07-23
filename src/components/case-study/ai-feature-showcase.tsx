import { ChatDemo } from "@/components/chat-demo";
import type { CaseStudy } from "@/lib/case-studies-data";

export function AIFeatureShowcase({ study }: { study: CaseStudy }) {
  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <h2 className="font-heading text-2xl font-semibold md:text-3xl">
          AI features implemented
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {study.aiFeatures.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card-interactive rounded-xl border border-border bg-background p-6">
                <span className="flex size-10 items-center justify-center rounded-md bg-accent/15 text-accent">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-heading text-lg font-medium">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
                <div className="mt-5">
                  <ChatDemo messages={f.demo} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
