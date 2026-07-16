import Link from "next/link";
import {
  UtensilsCrossed,
  ConciergeBell,
  Handshake,
  BookOpen,
  PenTool,
  ChartColumn,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/reveal";
import { aiSolutions } from "@/lib/ai-solutions-data";

const trustPoints = [
  "Edinburgh-based",
  "Plain-English, no jargon",
  "Free consultation, no obligation",
  "See it working before you commit",
];

const problems = [
  {
    title: "Missed enquiries after hours",
    body: "A customer messages at 9pm, gets no reply, and books somewhere else instead.",
  },
  {
    title: "Staff answering the same questions",
    body: "Opening hours, pricing, availability — the same five questions, all day, every day.",
  },
  {
    title: "No idea where to start with AI",
    body: "AI sounds useful, but nobody's shown you what it actually looks like for a business like yours.",
  },
];

const steps = [
  {
    step: "01",
    title: "Free AI consultation",
    body: "We look at how your business actually runs and tell you honestly where AI would save you time or win you business.",
  },
  {
    step: "02",
    title: "Free working prototype",
    body: "Before you pay anything, we build a real, clickable example of the AI solution — not a slide deck.",
  },
  {
    step: "03",
    title: "Launch & keep improving",
    body: "You approve it, we build it properly, and keep optimising it as your business changes.",
  },
];

const SOLUTION_ICONS: Record<string, LucideIcon> = {
  "customer-assistant": UtensilsCrossed,
  receptionist: ConciergeBell,
  "sales-assistant": Handshake,
  "knowledge-assistant": BookOpen,
  "content-automation": PenTool,
  "analytics-assistant": ChartColumn,
};

export default function HomePage() {
  return (
    <>
      <section className="aurora-bg mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <Badge variant="secondary" className="mb-6">
          Edinburgh, Scotland
        </Badge>
        <h1 className="max-w-3xl font-heading text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          Transform your business with{" "}
          <span className="gradient-text">AI-powered</span> digital
          solutions.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground text-balance">
          We help Edinburgh businesses automate tasks, improve customer
          experiences, and unlock new growth opportunities using practical
          AI solutions. We don&apos;t just build websites — we make
          businesses smarter with AI.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" variant="gradient" render={<Link href="/contact" />}>
            Book a free AI consultation
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/ai-solutions" />}>
            See AI solutions in action
          </Button>
        </div>

        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {trustPoints.map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="text-accent">✓</span>
              {t}
            </span>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              Sound familiar?
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {problems.map((p, i) => (
              <Reveal key={p.title} delay={i * 80}>
                <div className="card-interactive h-full rounded-lg border border-border bg-background p-5">
                  <h3 className="font-heading text-lg font-medium">{p.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl font-semibold md:text-3xl">
                What AI can do for your business
              </h2>
              <p className="mt-2 max-w-lg text-muted-foreground">
                Six practical solutions, each with a real example you can
                read in under a minute.
              </p>
            </div>
            <Button variant="link" className="px-0" render={<Link href="/ai-solutions" />}>
              See all AI solutions →
            </Button>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {aiSolutions.map((s, i) => {
            const Icon = SOLUTION_ICONS[s.slug] ?? Handshake;
            return (
              <Reveal key={s.slug} delay={i * 60}>
                <Link
                  href={`/ai-solutions#${s.slug}`}
                  className="card-interactive block h-full rounded-lg border border-border bg-background p-5"
                >
                  <span className="flex size-9 items-center justify-center rounded-md bg-accent/15 text-accent">
                    <Icon className="size-4.5" />
                  </span>
                  <p className="mt-3 text-xs font-medium tracking-wide text-accent uppercase">
                    {s.audience}
                  </p>
                  <h3 className="mt-1 font-heading text-lg font-medium">{s.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.callout}</p>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between md:py-20">
          <Reveal>
            <div>
              <h2 className="font-heading text-2xl font-semibold md:text-3xl">
                See it running on a real-feeling website
              </h2>
              <p className="mt-2 max-w-lg text-muted-foreground">
                Concept redesigns for Edinburgh businesses — with the AI
                features built in, not just described.
              </p>
            </div>
          </Reveal>
          <Button size="lg" variant="gradient" render={<Link href="/portfolio" />}>
            View the portfolio
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">
            How it works
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.step} delay={i * 80}>
              <div>
                <span className="gradient-text font-heading text-3xl font-semibold">
                  {s.step}
                </span>
                <h3 className="mt-2 font-heading text-lg font-medium">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between md:py-20">
          <div>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              Ready to see what AI could do for your business?
            </h2>
            <p className="mt-2 text-primary-foreground/70">
              No charge, no obligation — just a free consultation and a
              working example.
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
