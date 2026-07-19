import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { ContactForm } from "@/components/contact-form";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact | Hamish AI",
  description:
    "Book a free AI consultation — no charge, no obligation.",
};

const trustPoints = [
  "Edinburgh-based",
  "No charge, no obligation",
  "Real reply from Hamish, not a bot",
  "Usually within 1–2 working days",
];

const steps = [
  {
    step: "01",
    title: "You tell us about your business",
    body: "A couple of sentences on what you do and where things feel slow or manual is plenty to start with.",
  },
  {
    step: "02",
    title: "We send an honest breakdown",
    body: "Specific ideas for where AI would actually help your business — not a generic sales pitch.",
  },
  {
    step: "03",
    title: "If it's a fit, we build first",
    body: "A free working prototype, built before you pay anything, so you can see it before deciding.",
  },
];

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-5xl px-6 pt-16 pb-24 md:pt-24">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <Badge variant="secondary" className="mb-6">
            Free AI consultation
          </Badge>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            Let&apos;s see what AI could do for your business.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Tell us a bit about your business and we&apos;ll send a short,
            honest breakdown of where AI could save you time or win you more
            customers — no charge, no obligation.
          </p>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {trustPoints.map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="text-accent">✓</span>
                {t}
              </span>
            ))}
          </div>

          <div className="mt-10 space-y-6">
            {steps.map((s) => (
              <div key={s.step} className="flex gap-4">
                <span className="gradient-text font-heading text-2xl font-semibold">
                  {s.step}
                </span>
                <div>
                  <h2 className="font-heading text-base font-medium">{s.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-sm text-muted-foreground">
            <p>Prefer email?</p>
            <a href={`mailto:${siteConfig.email}`} className="text-foreground hover:underline">
              {siteConfig.email}
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-6 md:p-8">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
