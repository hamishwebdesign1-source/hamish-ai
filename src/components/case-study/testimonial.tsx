import Image from "next/image";
import { Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CaseStudy } from "@/lib/case-studies-data";

export function Testimonial({ study }: { study: CaseStudy }) {
  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/[0.03] md:flex">
          {study.signatureImage && (
            <div className="relative h-36 w-full md:h-auto md:w-56 md:shrink-0">
              <Image
                src={study.signatureImage}
                alt=""
                fill
                sizes="(min-width: 768px) 224px, 100vw"
                className="object-cover"
              />
            </div>
          )}
          <div className="p-8 md:p-10">
            <div className="flex items-center justify-between gap-4">
              <span className="flex size-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Quote className="size-5" />
              </span>
              <Badge variant="outline">Illustrative example — not a real client</Badge>
            </div>
            <p className="mt-6 font-heading text-2xl leading-snug text-balance md:text-3xl">
              &ldquo;{study.testimonial.quote}&rdquo;
            </p>
            <p className="mt-6 text-sm text-muted-foreground">{study.testimonial.role}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
