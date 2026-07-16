import Image from "next/image";
import { Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CaseStudy } from "@/lib/case-studies-data";

export function Testimonial({ study }: { study: CaseStudy }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 md:py-20">
      <div className="overflow-hidden rounded-xl border border-border bg-secondary/40 md:flex">
        {study.signatureImage && (
          <div className="relative h-32 w-full md:h-auto md:w-48 md:shrink-0">
            <Image
              src={study.signatureImage}
              alt=""
              fill
              sizes="(min-width: 768px) 192px, 100vw"
              className="object-cover"
            />
          </div>
        )}
        <div className="p-8 md:p-10">
          <Badge variant="outline" className="mb-4">
            Illustrative example — not a real client
          </Badge>
          <Quote className="size-8 text-accent" />
          <p className="mt-4 font-heading text-xl leading-relaxed text-balance md:text-2xl">
            &ldquo;{study.testimonial.quote}&rdquo;
          </p>
          <p className="mt-6 text-sm text-muted-foreground">{study.testimonial.role}</p>
        </div>
      </div>
    </section>
  );
}
