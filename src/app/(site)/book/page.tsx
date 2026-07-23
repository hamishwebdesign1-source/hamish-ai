import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { Eyebrow } from "@/components/eyebrow";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Book a consultation | Hamish AI",
  description:
    "Pick a time straight off the calendar for a free, no-obligation AI consultation call.",
};

const trustPoints = [
  "30 minutes, over a call or video",
  "No charge, no obligation",
  "You'll speak to Hamish directly, not a bot",
];

export default function BookPage() {
  const calendlyUrl = process.env.CALENDLY_URL;

  return (
    <section className="mx-auto max-w-5xl px-6 pt-16 pb-24 md:pt-24">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <div>
          <Eyebrow className="mb-6">Free consultation</Eyebrow>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            Pick a time. We&apos;ll take it from there.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            A real 30-minute conversation about your business — what&apos;s
            slow, what&apos;s manual, and whether AI would actually help.
            Straight onto the calendar, no back-and-forth emails.
          </p>

          <div className="mt-8 flex flex-col gap-2 text-sm text-muted-foreground">
            {trustPoints.map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="text-accent">✓</span>
                {t}
              </span>
            ))}
          </div>

          <div className="mt-10 text-sm text-muted-foreground">
            <p>Prefer to tell us about your business first?</p>
            <Link href="/contact" className="text-foreground hover:underline">
              Use the contact form instead
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-2 md:p-4">
          {calendlyUrl ? (
            <>
              <div
                className="calendly-inline-widget"
                data-url={calendlyUrl}
                style={{ minWidth: 280, height: 700 }}
              />
              <Script
                src="https://assets.calendly.com/assets/external/widget.js"
                strategy="afterInteractive"
              />
            </>
          ) : (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-8 text-center">
              <p className="font-heading text-lg font-medium">
                Calendar coming very soon
              </p>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                The booking calendar isn&apos;t connected yet — in the
                meantime, email directly and we&apos;ll find a time that works.
              </p>
              <a
                href={`mailto:${siteConfig.email}`}
                className="mt-6 text-sm font-medium text-accent hover:underline"
              >
                {siteConfig.email}
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
