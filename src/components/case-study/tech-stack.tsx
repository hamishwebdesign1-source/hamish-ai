import { Badge } from "@/components/ui/badge";
import type { CaseStudy } from "@/lib/case-studies-data";

export function TechStack({ study }: { study: CaseStudy }) {
  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <h2 className="font-heading text-2xl font-semibold md:text-3xl">
          Technologies used
        </h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {study.tech.map((t) => (
            <Badge key={t} variant="secondary" className="px-3 py-1.5 text-sm">
              {t}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  );
}
