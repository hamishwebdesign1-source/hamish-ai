import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CaseStudyHero } from "@/components/case-study/case-study-hero";
import { ChallengeSolution } from "@/components/case-study/challenge-solution";
import { WebsiteShowcase } from "@/components/case-study/website-showcase";
import { AIFeatureShowcase } from "@/components/case-study/ai-feature-showcase";
import { StatsGrid } from "@/components/case-study/stats-grid";
import { Testimonial } from "@/components/case-study/testimonial";
import { TechStack } from "@/components/case-study/tech-stack";
import { caseStudies, getCaseStudy } from "@/lib/case-studies-data";

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) return {};

  return {
    title: `${study.name} Case Study | Hamish AI`,
    description: study.overview,
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) notFound();

  return (
    <>
      <CaseStudyHero study={study} />
      <ChallengeSolution study={study} />
      <WebsiteShowcase study={study} />
      <AIFeatureShowcase study={study} />
      <StatsGrid study={study} />
      <Testimonial study={study} />
      <TechStack study={study} />

      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between md:py-20">
          <div>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              Want results like {study.name}?
            </h2>
            <p className="mt-2 max-w-lg text-muted-foreground">
              Book a free AI consultation and we&apos;ll show you exactly
              what this could look like for your business.
            </p>
          </div>
          <Button size="lg" variant="gradient" render={<Link href="/contact" />}>
            Book a free AI consultation
          </Button>
        </div>
      </section>
    </>
  );
}
