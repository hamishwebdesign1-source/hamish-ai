import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, Check, Minus, Globe, Workflow, TrendingUp, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { packages, foundingOfferNote, analyticsPackage } from "@/lib/site-config";

// Derived directly from each package's real feature list below — nothing
// here is invented, it's the same facts read as a comparable matrix
// instead of three separate bullet lists.
type Cell = "yes" | "upgraded" | "no";
const comparisonRows: { label: string; values: [Cell, Cell, Cell] }[] = [
  { label: "Full website redesign, mobile-first", values: ["yes", "yes", "no"] },
  { label: "AI assistant for your business", values: ["yes", "upgraded", "upgraded"] },
  { label: "SEO + Google Business Profile", values: ["yes", "yes", "no"] },
  { label: "Performance reporting", values: ["yes", "yes", "upgraded"] },
  { label: "Booking & lead-qualification automation", values: ["no", "yes", "no"] },
  { label: "CRM / calendar integration", values: ["no", "yes", "no"] },
  { label: "Content automation — social, email, blog", values: ["no", "no", "yes"] },
  { label: "Priority support", values: ["no", "no", "yes"] },
];

export const metadata: Metadata = {
  title: "Services & Pricing | Hamish AI",
  description:
    "Founding client pricing on three AI transformation packages for Edinburgh businesses — website, automation, and ongoing growth.",
};

const packageIcons = [Globe, Workflow, TrendingUp];

const pricingFaqs = [
  {
    question: "What happens once the 5 founding spots are gone?",
    answer:
      "Pricing moves to the standard rate shown struck through on each package. Anyone who signs up while a founding spot is available keeps that price for the project regardless of when it's delivered.",
  },
  {
    question: "Can I start with one package and add another later?",
    answer:
      "Yes — most clients start with the AI Website Transformation and add automation once they can see the site working. Nothing here requires committing to everything upfront.",
  },
  {
    question: "Is the Growth Partnership a contract?",
    answer:
      "No — it's ongoing and you can cancel anytime, as noted on the package itself.",
  },
];

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services & pricing"
        title="AI transformation, at founding client prices."
        description="Every project starts with a free AI consultation and a free working prototype — you only pay once you can see exactly what you're getting."
        visual={
          <div className="mx-auto max-w-sm rounded-2xl border border-accent/50 bg-background p-6 shadow-2xl shadow-accent/10">
            <Badge className="mb-4 w-fit bg-accent text-accent-foreground">
              Most popular
            </Badge>
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Workflow className="size-5" />
            </span>
            <p className="mt-4 font-heading text-lg font-semibold">{packages[1].name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{packages[1].tagline}</p>
            <p className="mt-4 gradient-text font-heading text-3xl font-semibold">
              {packages[1].foundingPrice}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground line-through">
              {packages[1].standardPrice}
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {packages[1].features.slice(0, 3).map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <div className="mt-6 inline-flex max-w-xl items-start gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
          <span className="text-foreground">{foundingOfferNote}</span>
        </div>
      </PageHero>

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {packages.map((pkg, i) => {
            const Icon = packageIcons[i];
            return (
              <Reveal key={pkg.name} delay={i * 80} className="h-full">
                <div
                  className={`card-interactive relative flex h-full flex-col rounded-2xl border p-6 ${
                    pkg.highlighted
                      ? "border-accent/50 shadow-lg shadow-accent/10"
                      : "border-border"
                  }`}
                >
                  {pkg.highlighted && (
                    <Badge className="absolute -top-3 left-6 bg-accent text-accent-foreground">
                      Most popular
                    </Badge>
                  )}
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Icon className="size-5" />
                  </span>
                  <p className="mt-4 font-heading text-lg font-semibold">{pkg.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{pkg.tagline}</p>
                  <p className="mt-4 gradient-text font-heading text-2xl font-semibold">
                    {pkg.foundingPrice}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground line-through">
                    {pkg.standardPrice}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{pkg.timeline}</p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm">
                    {pkg.features.slice(0, 3).map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full"
                    variant={pkg.highlighted ? "gradient" : "outline"}
                    render={<Link href="/contact" />}
                  >
                    Enquire
                  </Button>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12 md:pb-16">
        <h2 className="font-heading text-xl font-semibold md:text-2xl">
          Compare every feature in detail
        </h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="w-1/4 pb-4 text-left align-bottom"></th>
                {packages.map((pkg) => (
                  <th key={pkg.name} className="px-4 pb-4 text-left align-bottom">
                    <p className="font-heading text-base font-semibold">{pkg.name}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? "bg-secondary/40" : ""}>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{row.label}</td>
                  {row.values.map((cell, ci) => (
                    <td key={ci} className="px-4 py-3.5">
                      {cell === "yes" && <Check className="size-4 text-accent" />}
                      {cell === "upgraded" && (
                        <div className="flex items-center gap-1.5">
                          <Check className="size-4 text-accent" />
                          <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                            upgraded
                          </span>
                        </div>
                      )}
                      {cell === "no" && <Minus className="size-4 text-muted-foreground/40" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <Badge variant="secondary" className="mb-4">
              A fourth pillar
            </Badge>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              {analyticsPackage.name}
            </h2>
            <p className="mt-2 max-w-lg text-muted-foreground">
              For businesses ready to go beyond the website and chatbot —
              understand what your data is actually telling you.
            </p>
          </Reveal>
          <Reveal delay={60}>
            <div className="mt-8 grid gap-8 rounded-2xl border border-accent/50 bg-background p-6 shadow-lg shadow-accent/10 md:grid-cols-[auto_1fr] md:items-center md:p-8">
              <div>
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <BarChart3 className="size-5" />
                </span>
                <p className="mt-4 text-sm text-muted-foreground">{analyticsPackage.tagline}</p>
                <p className="mt-4 gradient-text font-heading text-3xl font-semibold">
                  {analyticsPackage.foundingPrice}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground line-through">
                  {analyticsPackage.standardPrice}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {analyticsPackage.timeline}
                </p>
                <Button
                  className="mt-6 w-full md:w-auto"
                  variant="gradient"
                  render={<Link href="/contact" />}
                >
                  Enquire
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {analyticsPackage.features.map((f) => (
                  <div key={f} className="flex gap-2 rounded-lg bg-secondary/50 p-3 text-sm">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    <span className="text-muted-foreground">{f}</span>
                  </div>
                ))}
                <Button
                  variant="link"
                  className="col-span-full mt-1 justify-self-start px-0"
                  render={<Link href="/analytics" />}
                >
                  See AI Business Analytics in detail
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="max-w-3xl">
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              Pricing questions
            </h2>
            <Accordion className="mt-8">
              {pricingFaqs.map((faq) => (
                <AccordionItem key={faq.question} value={faq.question}>
                  <AccordionTrigger className="font-heading text-base">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between md:py-20">
          <div>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              Not sure which package fits?
            </h2>
            <p className="mt-2 max-w-lg text-primary-foreground/70">
              Start with a free AI consultation — we&apos;ll tell you honestly
              what your business actually needs, not just what we&apos;d like
              to sell you.
            </p>
          </div>
          <Button size="lg" variant="gradient" render={<Link href="/book" />}>
            Book a free AI consultation
          </Button>
        </div>
      </section>
    </>
  );
}
