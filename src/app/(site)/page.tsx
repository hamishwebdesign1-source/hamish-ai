import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/reveal";
import { ChatDemo } from "@/components/chat-demo";
import { ProcessTimeline } from "@/components/process-timeline";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { aiSolutions } from "@/lib/ai-solutions-data";

const trustPoints = [
  "Edinburgh-based",
  "Plain-English, no jargon",
  "Free consultation, no obligation",
  "See it working before you commit",
];

const heroDemo = [
  { role: "user" as const, text: "Can you tell me your opening hours and if you take walk-ins?" },
  {
    role: "ai" as const,
    text: "We're open Tuesday to Sunday, 9am–6pm, and yes — walk-ins are welcome, though booking ahead means less waiting. Want me to check today's availability for you?",
  },
];

const offerStats = [
  { value: "£0", label: "To see a working prototype" },
  { value: "1–2 weeks", label: "Typical turnaround for a website build" },
  { value: "5", label: "Founding client spots at this pricing" },
  { value: "24/7", label: "Your AI assistant is on duty" },
];

const faqs = [
  {
    question: "How much does this actually cost?",
    answer:
      "Founding client pricing starts from £595 for a website transformation, or from £1,200 for automation work — see the Services page for full package details. Whatever the scope, the free consultation and prototype come first, so you know the real number before committing to anything.",
  },
  {
    question: "What if I don't like the free prototype?",
    answer:
      "Then you walk away and it's cost you nothing. The prototype is built specifically so you can judge it before paying, not to pressure you into a yes.",
  },
  {
    question: "I don't know anything about AI — is that a problem?",
    answer:
      "No. The free consultation exists to translate what AI could do into plain terms for your specific business, not to test how technical you are.",
  },
  {
    question: "Is my business data safe?",
    answer:
      "Any AI assistant we build only answers from the information and documents you approve — nothing is shared beyond what's needed to run it, and it's covered in detail during the consultation.",
  },
  {
    question: "How long until it's actually live?",
    answer:
      "A website transformation typically takes 1–2 weeks once you approve the prototype; automation projects usually take 2–4 weeks depending on scope.",
  },
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

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <Badge variant="secondary" className="mb-6">
              Edinburgh, Scotland
            </Badge>
            <h1 className="max-w-xl font-heading text-4xl font-semibold tracking-tight text-balance md:text-6xl">
              Transform your business with AI-powered digital solutions.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground text-balance">
              We help Edinburgh businesses automate tasks, improve customer
              experiences, and unlock new growth opportunities using
              practical AI solutions. We don&apos;t just build websites —
              we make businesses smarter with AI.
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
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-accent" />
              </span>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                A real example — this is what an AI assistant can do
              </p>
            </div>
            <div className="mt-4">
              <ChatDemo messages={heroDemo} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4 md:py-12">
          {offerStats.map((s, i) => (
            <Reveal key={s.label} delay={i * 60}>
              <div>
                <p className="gradient-text font-heading text-3xl font-semibold md:text-4xl">
                  {s.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            </Reveal>
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
          {aiSolutions.map((s, i) => (
            <Reveal key={s.slug} delay={i * 60}>
              <Link
                href={`/ai-solutions#${s.slug}`}
                className="card-interactive block h-full overflow-hidden rounded-lg border border-border bg-background"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-primary">
                  <Image
                    src={s.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  <p className="font-mono text-xs font-medium tracking-wide text-accent uppercase">
                    {s.audience}
                  </p>
                  <h3 className="mt-1 font-heading text-lg font-medium">{s.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.callout}</p>
                </div>
              </Link>
            </Reveal>
          ))}
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
          <p className="mt-2 max-w-lg text-muted-foreground">
            Step through it — click a stage to see what actually happens.
          </p>
        </Reveal>
        <Reveal delay={40}>
          <ProcessTimeline steps={steps} />
        </Reveal>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
          <Reveal>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              Common questions
            </h2>
          </Reveal>
          <Reveal delay={40}>
            <Accordion className="mt-8">
              {faqs.map((faq) => (
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
          </Reveal>
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
