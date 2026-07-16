import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { ContactForm } from "@/components/contact-form";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact | Hamish AI",
  description:
    "Book a free AI consultation — no charge, no obligation.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 pt-16 pb-24 md:pt-24">
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

      <div className="mt-10 rounded-lg border border-border bg-background p-6 md:p-8">
        <ContactForm />
      </div>

      <div className="mt-10 text-sm text-muted-foreground">
        <p>Prefer to talk first?</p>
        <a href={`mailto:${siteConfig.email}`} className="text-foreground hover:underline">
          {siteConfig.email}
        </a>
        {" · "}
        <a href={`tel:${siteConfig.phone}`} className="text-foreground hover:underline">
          {siteConfig.phone}
        </a>
      </div>
    </section>
  );
}
