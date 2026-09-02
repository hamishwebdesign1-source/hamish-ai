import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  UtensilsCrossed,
  Hammer,
  ConciergeBell,
  Dumbbell,
  Briefcase,
  MessagesSquare,
  ShieldCheck,
  Activity,
  Receipt,
  MoonStar,
  RefreshCcw,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/reveal";
import { Eyebrow } from "@/components/eyebrow";
import { ParallaxLayer } from "@/components/parallax-layer";
import { ProcessTimeline } from "@/components/process-timeline";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { aiSolutions } from "@/lib/ai-solutions-data";
import { dashboardKpis, aiInsights } from "@/lib/analytics-data";
import { KpiCard } from "@/components/analytics/kpi-card";
import { FaqJsonLd } from "@/components/seo/faq-json-ld";

const industries = [
  { icon: UtensilsCrossed, name: "Restaurants & cafés", href: "/portfolio/the-gannet" },
  { icon: Hammer, name: "Trades", href: "/portfolio/craigie-and-sons" },
  { icon: ConciergeBell, name: "Hotels & hospitality", href: "/portfolio/assembly-rooms-hotel" },
  { icon: Dumbbell, name: "Gyms & fitness studios", href: "/portfolio/forge-fitness" },
  { icon: Briefcase, name: "Professional services", href: "/portfolio/lomond-and-grey" },
];

const dogfoodPoints = [
  {
    icon: MessagesSquare,
    title: "AI reads every enquiry",
    body: "Claude triages incoming client requests and drafts a response — before we've even opened the inbox.",
  },
  {
    icon: ShieldCheck,
    title: "Every auto-sent reply is checked",
    body: "We audit our own AI's accuracy on a rolling basis, not just trust it and hope.",
  },
  {
    icon: Activity,
    title: "Live uptime monitoring",
    body: "Client websites are checked around the clock, with an instant alert the moment something breaks.",
  },
  {
    icon: Receipt,
    title: "Billing runs itself",
    body: "Recurring invoices go out automatically each month — no spreadsheets, no chasing.",
  },
];

const teaserKpiIds = ["revenue", "leads", "conversion", "response-time"];
const homepageTeaserKpis = dashboardKpis.filter((k) => teaserKpiIds.includes(k.id));

const trustPoints = [
  "Edinburgh-based",
  "Plain-English, no jargon",
  "Free consultation, no obligation",
  "See it working before you commit",
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
    icon: MoonStar,
    title: "Missed enquiries after hours",
    body: "A customer messages at 9pm, gets no reply, and books somewhere else instead.",
  },
  {
    icon: RefreshCcw,
    title: "Staff answering the same questions",
    body: "Opening hours, pricing, availability — the same five questions, all day, every day.",
  },
  {
    icon: Compass,
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
      <section className="relative isolate overflow-hidden bg-[#0d1420]">
        <ParallaxLayer speed={0.12} className="absolute inset-x-0 -top-24 h-[calc(100%+12rem)]">
          {/* Poster doubles as the reduced-motion fallback: the video sits on
              top and is hidden by the prefers-reduced-motion rule in
              globals.css, which reveals this still frame underneath. */}
          <Image
            src="/videos/hero-edinburgh-poster.jpg"
            alt="Aerial view of Edinburgh's Old Town at golden hour, looking over the rooftops toward the Balmoral clock tower and the Castle"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <video
            className="hero-bg-video absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster="/videos/hero-edinburgh-poster.jpg"
            aria-hidden="true"
          >
            <source src="/videos/hero-edinburgh-1080p.mp4" type="video/mp4" media="(min-width: 768px)" />
            <source src="/videos/hero-edinburgh-540p.mp4" type="video/mp4" />
          </video>
        </ParallaxLayer>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1420] via-[#0d1420]/75 to-[#0d1420]/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1420] via-transparent to-[#0d1420]/30" />
        {/* No node-and-line overlay here (dropped — see redesign notes,
            19 Aug 2026): real drone footage of the city is the hero's actual
            asset, and laying a synthetic "AI network" motif over real
            photography read as clip art on top of a photo, not texture. */}

        <div className="relative mx-auto max-w-6xl px-6 pt-14 pb-16 md:pt-20 md:pb-24">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
            <div>
              <Badge variant="secondary" className="mb-6 border-white/15 bg-white/10 text-white">
                Edinburgh, Scotland
              </Badge>
              {/* Rewritten 19 Aug 2026 — "Transform your business with
                  AI-powered digital solutions" was the generic template
                  headline every AI agency site opens with, and said nothing
                  a stranger couldn't already guess. This says the one thing
                  that's actually true and unusual about the offer: you see
                  it built, working, before you've paid anything. */}
              <h1 className="max-w-xl text-4xl font-bold tracking-tight text-balance text-white md:text-6xl">
                See it working <span className="text-accent">before you pay</span> for it.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-white/70 text-balance">
                We build Edinburgh businesses a free, working AI prototype
                first — a real chatbot you can actually try, not a slide
                deck — so you know exactly what you&apos;re getting before
                committing to anything.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" variant="gradient" render={<Link href="/contact" />}>
                  Book a free AI consultation
                  <ArrowRight className="size-4 transition-transform group-hover/button:translate-x-0.5" />
                </Button>
                <Button size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10" render={<Link href="/ai-solutions" />}>
                  See AI solutions in action
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
                {trustPoints.map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <span className="text-accent">✓</span>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <Eyebrow pulse>A real example — this is what an AI assistant can do</Eyebrow>
              <div className="mt-4 max-w-sm overflow-hidden rounded-xl border border-white/15 shadow-2xl shadow-black/40">
                <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#0d1420] px-3 py-2">
                  <span className="size-2.5 rounded-full bg-destructive/50" />
                  <span className="size-2.5 rounded-full bg-accent/50" />
                  <span className="size-2.5 rounded-full bg-emerald-500/50" />
                </div>
                <Image
                  src="/hero-chat-demo.gif"
                  alt="A real conversation with the Hamish AI chat assistant, answering a customer's question about walk-ins"
                  width={376}
                  height={562}
                  unoptimized
                  priority
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4 md:py-12">
          {offerStats.map((s, i) => (
            <Reveal key={s.label} delay={i * 60}>
              <div>
                <p className="font-heading text-3xl font-semibold md:text-4xl">
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
            <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-balance md:text-3xl">
              Sound familiar? Here&apos;s what AI can actually do about it.
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-4 border-b border-border/60 pb-10 sm:grid-cols-3">
            {problems.map((p, i) => (
              <Reveal key={p.title} delay={i * 60}>
                <div className="card-interactive flex h-full items-start gap-3 rounded-lg border border-border bg-background p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <p.icon className="size-4" />
                  </span>
                  <div>
                    <p className="font-heading text-sm font-semibold">{p.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
              <p className="max-w-lg text-muted-foreground">
                Six practical solutions, each with a real example you can
                read in under a minute.
              </p>
              <Button variant="link" className="px-0" render={<Link href="/ai-solutions" />}>
                See all AI solutions →
              </Button>
            </div>
          </Reveal>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {aiSolutions.map((s, i) => (
              <Reveal key={s.slug} delay={140 + i * 60}>
                <Link
                  href={`/ai-solutions#${s.slug}`}
                  className="card-interactive block h-full overflow-hidden rounded-lg border border-border bg-background"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-primary">
                    <Image
                      src={s.image}
                      alt={`${s.name} illustration`}
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
        </div>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              Proof, not promises.
            </h2>
            <p className="mt-2 max-w-lg text-muted-foreground">
              We&apos;re not describing automation from the outside — Hamish
              AI&apos;s own operations run on the same system we&apos;d build for you.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <Reveal delay={60}>
              <div className="flex h-full flex-col rounded-xl border border-border bg-background p-6">
                <div className="flex items-center justify-between gap-2">
                  <Eyebrow>AI Business Analytics</Eyebrow>
                  {/* Same disclosure command-centre.tsx already shows on
                      the full /analytics dashboard these tiles link to —
                      the homepage teaser was the one place on the site
                      missing it, which read as real revenue at a glance
                      (real feedback, a Skool reply, 19 Aug 2026). */}
                  <span className="font-mono text-[10px] tracking-wide text-muted-foreground/70 uppercase">
                    Illustrative — fictional data
                  </span>
                </div>
                <p className="mt-2 font-heading text-lg font-medium">Turn your data into decisions.</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {homepageTeaserKpis.map((kpi) => (
                    <KpiCard key={kpi.id} kpi={kpi} compact />
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-foreground">
                  &ldquo;{aiInsights[0].text}&rdquo;
                </div>
                <Button
                  variant="link"
                  className="mt-4 self-start px-0"
                  render={<Link href="/analytics" />}
                >
                  Explore AI Business Analytics
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl shadow-accent/10">
                <div className="flex items-center gap-1.5 border-b border-border bg-secondary/60 px-3 py-2">
                  <span className="size-2.5 rounded-full bg-destructive/50" />
                  <span className="size-2.5 rounded-full bg-accent/50" />
                  <span className="size-2.5 rounded-full bg-emerald-500/50" />
                  <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                    hamishai.org/admin
                  </span>
                </div>
                <ul className="flex-1 divide-y divide-border">
                  {dogfoodPoints.map((d) => (
                    <li key={d.title} className="flex items-start gap-3 p-4">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <d.icon className="size-4" />
                      </span>
                      <div>
                        <p className="font-heading text-sm font-medium">{d.title}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{d.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border p-4">
                  <Button variant="link" className="px-0" render={<Link href="/services" />}>
                    See it in the Growth Partnership package
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                {/* Was "Industries we've worked with" / "Built for real
                    Edinburgh businesses" — factually wrong for a portfolio
                    of illustrative concept builds (see case-studies-data.ts),
                    and the one line on the homepage that directly
                    contradicted /portfolio's own honest framing one click
                    later. Real feedback, a Skool reply, 19 Aug 2026: "the
                    homepage framing sitting above them isn't [honest]...
                    that's the one a cafe owner would catch." */}
                <Eyebrow className="mb-3">Concept portfolio</Eyebrow>
                <h2 className="font-heading text-2xl font-semibold md:text-3xl">
                  See what this could look like for a business like yours.
                </h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Illustrative concept builds, not real clients yet — each one links through to a fully working
                  live site, not a static mock-up.
                </p>
              </div>
              <Button size="lg" render={<Link href="/portfolio" />}>
                View the portfolio
              </Button>
            </div>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {industries.map((ind, i) => (
              <Reveal key={ind.name} delay={i * 60}>
                <Link
                  href={ind.href}
                  className="card-interactive group flex h-full flex-col items-start gap-3 rounded-xl border border-border bg-background p-5"
                >
                  <span className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <ind.icon className="size-5" />
                  </span>
                  <span className="font-heading text-base font-medium">{ind.name}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                    See case study
                    <ArrowRight className="size-3" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
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

      {/* A lower-commitment step before the FAQ/final "book a call" CTA —
          same funnel shape the automatethejourney.com research this was
          scoped from uses (free diagnostics before any sales
          conversation), not a duplicate of the closing CTA below it. */}
      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <Eyebrow className="mb-4">Free, no obligation</Eyebrow>
                <h2 className="font-heading text-2xl font-semibold md:text-3xl">
                  Not ready to talk yet? Check your website first.
                </h2>
                <p className="mt-2 max-w-lg text-muted-foreground">
                  Real technical checks plus a plain-English AI review — what&apos;s working, what isn&apos;t, and
                  where AI could specifically help. Free, in under a minute.
                </p>
              </div>
              <Button size="lg" variant="outline" render={<Link href="/website-audit" />}>
                Get my free website check
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="max-w-3xl">
            <FaqJsonLd faqs={faqs} />
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
          <Button size="lg" variant="secondary" render={<Link href="/contact" />}>
            Book a free AI consultation
          </Button>
        </div>
      </section>
    </>
  );
}
