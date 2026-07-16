import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CaseStudy } from "@/lib/case-studies-data";

export function CaseStudyHero({ study }: { study: CaseStudy }) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage: `radial-gradient(circle at 15% 15%, ${study.accentFrom}33, transparent 45%), radial-gradient(circle at 85% 30%, ${study.accentTo}33, transparent 50%)`,
        }}
      />
      <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
        <Badge variant="secondary" className="mb-6">
          Case study · {study.industry}
        </Badge>
        <h1 className="max-w-3xl font-heading text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          {study.name}
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">{study.overview}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" variant="gradient" render={<Link href="/contact" />}>
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

        {/* Featured image */}
        <div className="card-interactive relative mt-14 h-64 w-full overflow-hidden rounded-xl border border-border md:h-96">
          <Image
            src={study.imageUrl}
            alt={`${study.name} — featured image`}
            fill
            sizes="(min-width: 1024px) 1152px, 100vw"
            className="object-cover"
            priority
          />
          <div
            className="absolute inset-0 mix-blend-multiply"
            style={{
              backgroundImage: `linear-gradient(135deg, ${study.accentFrom}55, ${study.accentTo}55)`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
