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

const destinations = [
  {
    href: "/services",
    title: "Services & pricing",
    body: "See the three AI transformation packages and what each includes.",
  },
  {
    href: "/portfolio",
    title: "Portfolio",
    body: "Real examples of AI-powered redesigns for Edinburgh businesses.",
  },
  {
    href: "/book",
    title: "Book a consultation",
    body: "Pick a time straight off the calendar — no charge, no obligation.",
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
