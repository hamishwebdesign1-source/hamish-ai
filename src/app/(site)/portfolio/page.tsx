import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHero } from "@/components/page-hero";
import { caseStudies } from "@/lib/case-studies-data";

export const metadata: Metadata = {
  title: "Portfolio | Hamish AI",
  description:
    "Case studies showing what AI-powered web design and automation looks like for Edinburgh restaurants, trades, hotels, gyms, and professional services.",
};

export default function PortfolioPage() {
  return (
    <>
      <PageHero
        eyebrow="Portfolio"
        title="Case studies, not just concepts."
        description="Illustrative projects built to demonstrate the range of redesigns and AI features on offer — not real clients yet. Each one links to a fully working live site, not a static mock-up."
      />

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="grid gap-6 sm:grid-cols-2">
          {caseStudies.map((study) => (
            <Link
              key={study.slug}
              href={`/portfolio/${study.slug}`}
              className="card-interactive group overflow-hidden rounded-xl border border-border bg-background"
            >
              <div
                className="relative h-40 w-full overflow-hidden"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${study.accentFrom}, ${study.accentTo})`,
                }}
              >
                {study.signatureImage && (
                  <Image
                    src={study.signatureImage}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="p-6">
                <Badge variant="outline" className="mb-3 w-fit font-mono text-[10px] tracking-wide uppercase">
                  {study.industry}
                </Badge>
                <h2 className="font-heading text-2xl font-medium">{study.name}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {study.overview}
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent">
                  View case study
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
