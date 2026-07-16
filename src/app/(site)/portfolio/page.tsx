import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { caseStudies } from "@/lib/case-studies-data";

export const metadata: Metadata = {
  title: "Portfolio | Hamish AI",
  description:
    "Case studies showing what AI-powered web design and automation looks like for Edinburgh restaurants, trades, hotels, gyms, and professional services.",
};

export default function PortfolioPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-4 md:pt-24">
        <Badge variant="secondary" className="mb-6">
          Portfolio
        </Badge>
        <h1 className="max-w-2xl font-heading text-4xl font-semibold tracking-tight text-balance md:text-5xl">
          Case studies, not just concepts.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Illustrative projects built to demonstrate the range of redesigns
          and AI features on offer — not real clients yet. Each one links to
          a fully working live site, not a static mock-up.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="grid gap-6 sm:grid-cols-2">
          {caseStudies.map((study) => (
            <Link
              key={study.slug}
              href={`/portfolio/${study.slug}`}
              className="card-interactive group overflow-hidden rounded-xl border border-border bg-background"
            >
              <div
                className="h-40 w-full"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${study.accentFrom}, ${study.accentTo})`,
                }}
              />
              <div className="p-6">
                <Badge variant="outline" className="mb-3 w-fit">
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
