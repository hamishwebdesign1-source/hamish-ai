import { Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CaseStudy } from "@/lib/case-studies-data";

export function Testimonial({ study }: { study: CaseStudy }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 md:py-20">
      <div className="rounded-xl border border-border bg-secondary/40 p-8 md:p-10">
        <Badge variant="outline" className="mb-4">
          Illustrative example — not a real client
        </Badge>
        <Quote className="size-8 text-accent" />
        <p className="mt-4 font-heading text-xl leading-relaxed text-balance md:text-2xl">
          &ldquo;{study.testimonial.quote}&rdquo;
        </p>
        <p className="mt-6 text-sm text-muted-foreground">{study.testimonial.role}</p>
      </div>
    </section>
  );
}
