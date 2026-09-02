import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatWidget } from "@/components/chat-widget";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Page not found | Hamish AI",
};

// SEO audit (2 Sep 2026) — found genuinely stale, not just theoretically
// so: verified live that hamishai.org's real 404 page still pointed
// every "helpful destination" at the archived Edinburgh consultancy
// pages (Services, Portfolio, Book a consultation), missed by every
// other homepage-swap cleanup pass this session (nav, footer,
// Organization schema, og:image...). Updated to lead with the current
// Platform-first site's own real anchors — Portfolio kept as the one
// genuinely evergreen destination, real work either audience would want
// to see, not consultancy-exclusive.
const destinations = [
  {
    href: "/#how-it-works",
    title: "How it works",
    body: "See the real product journey — from first prospect to paid client.",
  },
  {
    href: "/#pricing",
    title: "Pricing",
    body: "Three plans, one 7-day free trial, no card required.",
  },
  {
    href: "/portfolio",
    title: "Portfolio",
    body: "Real examples of AI-powered redesigns for Edinburgh businesses.",
  },
];

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-6 pt-20 pb-24 text-center md:pt-28">
          <Badge variant="secondary" className="mb-6 font-mono text-xs uppercase">
            404
          </Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            That page doesn&apos;t exist — but the AI assistant is happy to help.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Open the chat in the bottom-right corner and ask what you were
            looking for, or try one of these instead.
          </p>

          <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
            {destinations.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className="card-interactive block rounded-lg border border-border bg-background p-5"
              >
                <h2 className="font-heading text-base font-medium">{d.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{d.body}</p>
              </Link>
            ))}
          </div>

          <Button size="lg" variant="outline" className="mt-10" render={<Link href="/" />}>
            Back to homepage
          </Button>
        </section>
      </main>
      <SiteFooter />
      <ChatWidget />
    </>
  );
}
