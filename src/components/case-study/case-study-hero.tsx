import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CaseStudy } from "@/lib/case-studies-data";

export function CaseStudyHero({ study }: { study: CaseStudy }) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      {/* Signature spine — this case study's own two colours, stated plainly
          rather than diffused into an ambient background wash. */}
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundImage: `linear-gradient(90deg, ${study.accentFrom}, ${study.accentTo})` }}
      />

      <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="flex items-center gap-2">
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: study.accentFrom }}
            aria-hidden
          />
          <p className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Case study &middot; {study.industry}
          </p>
        </div>
        <h1 className="mt-4 max-w-3xl font-heading text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          {study.name}
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">{study.overview}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" render={<Link href="/contact" />}>
            Get results like this
          </Button>
          <Button
            size="lg"
            variant="outline"
            render={<Link href={study.demoUrl} target="_blank" rel="noopener noreferrer" />}
          >
            View live site <ArrowRight className="size-4" />
          </Button>
        </div>

        {/* Featured image — duotoned in this case study's own colours rather
            than shown straight, so the palette reads as this business's
            identity even in a single still frame. */}
        <div className="relative mt-14 h-64 w-full overflow-hidden rounded-xl border border-border md:h-96">
          <Image
            src={study.imageUrl}
            alt={`${study.name} — featured image`}
            fill
            sizes="(min-width: 1024px) 1152px, 100vw"
            className="object-cover grayscale"
            priority
          />
          <div
            className="absolute inset-0 mix-blend-color"
            style={{
              backgroundImage: `linear-gradient(135deg, ${study.accentFrom}, ${study.accentTo})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        </div>
      </div>
    </section>
  );
}
