import Link from "next/link";
import type { Metadata } from "next";
import {
  Search,
  ClipboardList,
  Send,
  Users,
  FileText,
  Check,
  ArrowRight,
  ChartColumn,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { platformPlans, formatMonthlyPrice } from "@/lib/platform-plans";

export const metadata: Metadata = {
  title: "HamishAI Agency Platform — Launch Your Own AI Agency",
  description:
    "The platform behind HamishAI, now yours to run your own agency on. Prospecting, AI analysis, outreach and client delivery, in one workspace.",
};

const howItWorks = [
  {
    icon: Search,
    title: "Find prospects",
    description: "Point the discovery engine at your own niche and geography — the same engine that finds HamishAI's own clients.",
  },
  {
    icon: ClipboardList,
    title: "Analyse them",
    description: "One cached AI research pass per prospect: what's weak, what's missing, why they're worth pursuing.",
  },
  {
    icon: Send,
    title: "Reach out",
    description: "A tailored email, call script and LinkedIn message generated together, ready to send under your own name.",
  },
  {
    icon: Users,
    title: "Deliver as clients",
    description: "Manage the relationship, do the work you're actually selling, in a portal branded to your agency.",
  },
  {
    icon: FileText,
    title: "Report and invoice",
    description: "A client-facing report and a Stripe invoice, generated from the same data — not a second tool.",
  },
];

const agencyTypes = [
  { name: "AI Analytics", description: "Monthly performance reports, sold as a retainer." },
  { name: "AI Automation", description: "Booking, receptionist and workflow builds, sold as projects." },
  { name: "AI Lead Generation", description: "Qualified local prospects, sold directly to clients." },
];

const platformFaqs = [
  {
    question: "Isn't this just ChatGPT with extra steps?",
    answer:
      "ChatGPT doesn't remember which prospects you already researched, doesn't cache that research so you're not re-billed for it, and has no CRM, client portal or invoicing behind it. What you're paying for is the assembled system, not model access — the research and outreach happen to be AI-generated, the value is that they arrive already wired into a pipeline you'd otherwise have to build from four separate tools.",
  },
  {
    question: "Is this live yet?",
    answer:
      "The platform is in early access — we're onboarding a small number of agencies by hand before opening self-serve signup, the same consultation-first approach HamishAI itself uses. Book a call below and we'll tell you honestly whether it's ready for your niche.",
  },
  {
    question: "Is this the same technology HamishAI runs on?",
    answer:
      "Yes. This isn't a tool built to be sold — it's the prospecting, research and outreach engine hamishai.org runs its own operations on, packaged so you can run it for your own agency. See AI Business Analytics for a real look at that data.",
  },
];

export default function PlatformPage() {
  return (
    <>
      <PageHero
        eyebrow="HamishAI Agency Platform"
        title="Build an AI agency without building the technology."
        description="The platform behind HamishAI, now yours to run your own agency on. Prospecting, AI analysis, outreach and client delivery — in one workspace, under your own brand."
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" render={<Link href="/book" />}>
            Get early access
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/analytics" />}>
            See it running HamishAI itself
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </PageHero>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <Badge variant="secondary" className="mb-4">The actual problem</Badge>
          <h2 className="max-w-2xl font-heading text-2xl font-semibold text-balance md:text-3xl">
            Finding clients and saying something credible about each one is the hard part — not the AI.
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Most people trying to sell AI services today stitch together a scraper, a ChatGPT tab, a
            spreadsheet CRM and an invoice template by hand. That stitching is the actual pain, and it&apos;s
            what this replaces — not the AI itself.
          </p>
        </Reveal>
      </section>

      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">How it works</h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-5">
            {howItWorks.map((step, i) => (
              <Reveal key={step.title} delay={i * 80}>
                <div className="flex h-full flex-col rounded-2xl border border-border bg-background p-5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <step.icon className="size-4.5" />
                  </span>
                  <p className="mt-4 font-heading text-sm font-semibold">{step.title}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{step.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <Badge variant="secondary" className="mb-4">Two workspaces, both yours</Badge>
          <h2 className="max-w-2xl font-heading text-2xl font-semibold text-balance md:text-3xl">
            You get your own ops workspace. Your clients get their own portal.
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground">
            This isn&apos;t one shared dashboard with your name on it. It&apos;s the same two-tier structure
            hamishai.org itself runs on — a private workspace where you run the agency, and a separate, branded
            portal each of your own clients signs into to see their own results. They never see HamishAI, and
            they never see each other.
          </p>
        </Reveal>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-border bg-background p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <LayoutDashboard className="size-5" />
              </span>
              <p className="mt-4 font-heading text-base font-semibold">Your agency workspace</p>
              <p className="mt-1 text-sm text-muted-foreground">Where you run the business — private to you and your team.</p>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  "Every prospect, researched and scored",
                  "Every client you've signed, in one pipeline",
                  "Outreach drafts, reports and invoices",
                  "Signed in under your own agency, not HamishAI's",
                ].map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="h-full rounded-2xl border border-border bg-background p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Users className="size-5" />
              </span>
              <p className="mt-4 font-heading text-base font-semibold">Your clients&apos; portal</p>
              <p className="mt-1 text-sm text-muted-foreground">A separate, branded login for each business you sign — not a shared inbox.</p>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  "Their own sign-in — no password, magic link",
                  "Only their own reports and requests, never another client's",
                  "Your logo and accent colour, not HamishAI's",
                  "Where you deliver the work you're actually selling",
                ].map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <div className="flex items-start gap-4 rounded-2xl border border-accent/40 bg-accent/5 p-6 md:p-8">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <ChartColumn className="size-5" />
            </span>
            <div>
              <p className="font-heading text-lg font-semibold">Not a demo — proof.</p>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                We&apos;re not describing this from the outside. HamishAI&apos;s own leads, outreach and client
                reporting run on this exact system — the same engine you&apos;d be running for your own agency.
              </p>
              <Button variant="link" className="mt-3 px-0" render={<Link href="/analytics" />}>
                See AI Business Analytics
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </Reveal>
        </div>
      </section>

      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">Choose what your agency sells</h2>
            <p className="mt-2 max-w-lg text-muted-foreground">
              Fewer agency types, done properly — each one changes how prospecting and reporting behave, not
              just the label on your homepage.
            </p>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {agencyTypes.map((type, i) => (
              <Reveal key={type.name} delay={i * 80}>
                <div className="h-full rounded-2xl border border-border bg-background p-5">
                  <p className="font-heading text-sm font-semibold">{type.name}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{type.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">Pricing</h2>
          <p className="mt-2 max-w-lg text-muted-foreground">
            One plan for every part of the loop — prospecting, analysis, outreach and delivery — not a
            feature you unlock later.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {platformPlans.map((plan, i) => (
            <Reveal key={plan.slug} delay={i * 80} className="h-full">
              <div
                className={`card-interactive relative flex h-full flex-col rounded-2xl border p-6 ${
                  plan.highlighted ? "border-accent/50 shadow-lg shadow-accent/10" : "border-border"
                }`}
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-6 bg-accent text-accent-foreground">
                    Most agencies start here
                  </Badge>
                )}
                <p className="mt-4 font-heading text-lg font-semibold">{plan.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                <p className="mt-4 font-heading text-3xl font-semibold">
                  {formatMonthlyPrice(plan.monthlyPence)}
                  <span className="ml-1 font-body text-sm text-muted-foreground">/mo</span>
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={plan.highlighted ? "gradient" : "outline"}
                  render={<Link href="/book" />}
                >
                  Get early access
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          No standalone white-label tier yet — it&apos;s a future add-on on the Agency plan, turned on once
          you actually need it.
        </p>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="max-w-3xl">
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">Questions</h2>
            <Accordion className="mt-8">
              {platformFaqs.map((faq) => (
                <AccordionItem key={faq.question} value={faq.question}>
                  <AccordionTrigger className="font-heading text-base">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between md:py-20">
          <div>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">Ready to see it on your own niche?</h2>
            <p className="mt-2 max-w-lg text-primary-foreground/70">
              Early access is a short call, not a form — we&apos;ll tell you honestly whether this is ready
              for what you want to sell.
            </p>
          </div>
          <Button size="lg" variant="secondary" render={<Link href="/book" />}>
            Get early access
          </Button>
        </div>
      </section>
    </>
  );
}
