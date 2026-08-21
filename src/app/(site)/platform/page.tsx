import Link from "next/link";
import type { Metadata } from "next";
import { Check, ArrowRight, LayoutDashboard, Users, Rocket, Zap, Building2 } from "lucide-react";
import type { PlatformPlanSlug } from "@/lib/platform-plans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { Eyebrow } from "@/components/eyebrow";
import { HeroProductPanel } from "@/components/platform-preview/hero-product-panel";
import { JourneyExplorer } from "@/components/platform-preview/journey-explorer";
import { AgencyTypeSelector } from "@/components/platform-preview/agency-type-selector";
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

// Second pass at this page (see git history for the first) — compresses
// what had grown into eight-plus sections around one central story:
// account -> agency -> prospect -> sale -> client -> delivery -> results
// -> invoice -> payment. JourneyExplorer now carries most of what "How
// it works", "Turn insight into outreach", the client-portal preview,
// and the report/invoice preview used to do as separate sections; this
// file stays deliberately short so the page doesn't grow back into the
// length problem that prompted the rewrite.

// Starter/Professional/Agency, in that order — matches
// platformPlans.length exactly, but kept as its own local map rather than
// a field on PlatformPlan itself: platform-plans.ts is Stripe wiring and
// pricing facts, not presentation, and this icon choice is purely a
// display concern for the two places a plan card renders (here and
// /studio/billing).
const planIcons: Record<PlatformPlanSlug, typeof Rocket> = {
  starter: Rocket,
  professional: Zap,
  agency: Building2,
};

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
        description="From first prospect to paid client — prospecting, AI research, outreach, delivery, reporting and billing, in one connected system, under your own brand."
        visual={<HeroProductPanel />}
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

      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <Eyebrow className="mb-4">The complete journey</Eyebrow>
            <h2 className="max-w-2xl font-heading text-2xl font-semibold text-balance md:text-3xl">
              Stop stitching your agency together.
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Prospecting, AI research, outreach, client delivery, reporting and billing — one connected system.
              Click through each stage below.
            </p>
          </Reveal>
          <Reveal delay={100} className="mt-10">
            <JourneyExplorer />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <Eyebrow className="mb-4">Two workspaces</Eyebrow>
          <h2 className="max-w-2xl font-heading text-2xl font-semibold text-balance md:text-3xl">
            Your workspace. Their portal.
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            You run the agency from one private workspace. Each client you sign gets a separate, branded portal —
            your logo, your colour. They never see HamishAI, and never see each other.
          </p>
        </Reveal>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-border bg-background p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <LayoutDashboard className="size-5" />
              </span>
              <p className="mt-4 font-heading text-base font-semibold">Your agency workspace</p>
              <ul className="mt-3 space-y-2 text-sm">
                {["Every prospect and client in one pipeline", "Signed in under your own agency, not HamishAI's"].map((f) => (
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
              <ul className="mt-3 space-y-2 text-sm">
                {["No password — a magic link signs them in", "Your logo and accent colour, not HamishAI's"].map((f) => (
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

      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <Eyebrow className="mb-4">Choose what you sell</Eyebrow>
            <h2 className="max-w-2xl font-heading text-2xl font-semibold text-balance md:text-3xl">
              Three ways to run the business.
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Pick a model — it changes what prospecting, delivery and reporting look like, not just a label.
            </p>
          </Reveal>
          <Reveal delay={100} className="mt-8">
            <AgencyTypeSelector />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">Pricing</h2>
          <p className="mt-2 max-w-lg text-muted-foreground">One plan for every part of the loop. Understand the difference in five seconds.</p>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {platformPlans.map((plan, i) => {
            const PlanIcon = planIcons[plan.slug];
            return (
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
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <PlanIcon className="size-5" />
                  </span>
                  <p className="mt-4 font-heading text-lg font-semibold">{plan.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                  <p className="mt-4 font-heading text-3xl font-semibold tabular-nums">
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
                    variant={plan.highlighted ? "default" : "outline"}
                    render={<Link href="/book" />}
                  >
                    Get early access
                  </Button>
                </div>
              </Reveal>
            );
          })}
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
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">Build the agency. HamishAI runs the infrastructure.</h2>
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
