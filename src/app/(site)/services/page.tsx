import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { packages, foundingOfferNote } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Services & Pricing | Hamish AI",
  description:
    "Founding client pricing on three AI transformation packages for Edinburgh businesses — website, automation, and ongoing growth.",
};

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
          <span className="text-accent">🎉</span>
          <span className="text-foreground">{foundingOfferNote}</span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {packages.map((pkg) => (
            <Card
              key={pkg.name}
              className={
                pkg.highlighted
                  ? "card-interactive flex flex-col border-accent shadow-md"
                  : "card-interactive flex flex-col"
              }
            >
              <CardHeader>
                {pkg.highlighted && (
                  <Badge className="mb-2 w-fit bg-accent text-accent-foreground">
                    Most popular
                  </Badge>
                )}
                <CardTitle className="font-heading text-2xl">{pkg.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{pkg.tagline}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="gradient-text font-heading text-3xl font-semibold">
                  {pkg.foundingPrice}
                </p>
                <p className="mt-1 text-xs text-muted-foreground line-through">
                  {pkg.standardPrice}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Typical timeline: {pkg.timeline}
                </p>
                <Separator className="my-6" />
                <ul className="flex-1 space-y-3 text-sm">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-accent">✓</span>
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8"
                  variant={pkg.highlighted ? "gradient" : "outline"}
                  render={<Link href="/contact" />}
                >
                  Enquire about {pkg.name}
                </Button>
              </CardContent>
            </Card>
          ))}
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
