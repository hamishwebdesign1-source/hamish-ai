import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { packages, foundingOfferNote } from "@/lib/site-config";

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
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-4 md:pt-24">
        <Badge variant="secondary" className="mb-6">
          Services & pricing
        </Badge>
        <h1 className="max-w-2xl font-heading text-4xl font-semibold tracking-tight text-balance md:text-5xl">
          AI transformation, at founding client prices.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Every project starts with a free AI consultation and a free
          working prototype — you only pay once you can see exactly what
          you&apos;re getting.
        </p>
        <div className="mt-6 inline-flex max-w-xl items-start gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
          <span className="text-foreground">{foundingOfferNote}</span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className="w-1/4 pb-6 text-left align-bottom"></th>
                {packages.map((pkg) => (
                  <th key={pkg.name} className="px-4 pb-6 text-left align-bottom">
                    {pkg.highlighted && (
                      <Badge className="mb-3 w-fit bg-accent text-accent-foreground">
                        Most popular
                      </Badge>
                    )}
                    <p className="font-heading text-xl font-semibold">{pkg.name}</p>
                    <p className="mt-1 text-sm font-normal text-muted-foreground">
                      {pkg.tagline}
                    </p>
                    <p className="mt-4 gradient-text font-heading text-2xl font-semibold">
                      {pkg.foundingPrice}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground line-through">
                      {pkg.standardPrice}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {pkg.timeline}
                    </p>
                    <Button
                      className="mt-5 w-full"
                      size="sm"
                      variant={pkg.highlighted ? "gradient" : "outline"}
                      render={<Link href="/contact" />}
                    >
                      Enquire
                    </Button>
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

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
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
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <h2 className="font-heading text-2xl font-semibold md:text-3xl">
          Not sure which package fits?
        </h2>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Start with a free AI consultation — we&apos;ll tell you honestly
          what your business actually needs, not just what we&apos;d like to
          sell you.
        </p>
        <Button size="lg" variant="gradient" className="mt-6" render={<Link href="/contact" />}>
          Book a free AI consultation
        </Button>
      </section>
    </>
  );
}
