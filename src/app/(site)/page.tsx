import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Check, ArrowRight, LayoutDashboard, Users, Rocket, Zap, Building2, ChartColumn } from "lucide-react";
import type { PlatformPlanSlug } from "@/lib/platform-plans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/reveal";
import { Eyebrow } from "@/components/eyebrow";
import { ParallaxLayer } from "@/components/parallax-layer";
import { HeroProductPanel } from "@/components/platform-preview/hero-product-panel";
import { StudioTour } from "@/components/platform-preview/studio-tour";
import { AgencyTypeSelector } from "@/components/platform-preview/agency-type-selector";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { platformPlans, formatMonthlyPrice } from "@/lib/platform-plans";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { FaqJsonLd } from "@/components/seo/faq-json-ld";
import { PlatformProductJsonLd } from "@/components/seo/platform-product-json-ld";

export const metadata: Metadata = {
  title: "HamishAI Agency Platform — Launch Your Own AI Agency",
  description:
    "The platform behind HamishAI, now yours to run your own agency on. Prospecting, AI analysis, outreach and client delivery, in one workspace.",
  alternates: { canonical: "/" },
};

// Moved here from (site)/platform/page.tsx 2 Sep 2026 — the Agency
// Platform is the growth focus now, so it's the homepage; the previous
// homepage (Edinburgh client-services pitch) moved to /agency, still
// real and still running, just no longer the front door. /platform
// itself now 301-redirects here (next.config.ts) rather than staying a
// duplicate page. See agency/page.tsx's own comment for the fuller
// reasoning. Content below is unchanged from the old /platform page —
// same copy, same real claims, new address — this was a routing change,
// not a rewrite.
//
// Third pass at this page (see git history) — compresses the second
// pass's 7-section, 7-stage-journey version further: six stages now
// (Build/Find/Win/Deliver/Prove/Grow, not seven), copy trimmed
// throughout, and the "proof" section restored in a shorter form after
// it turned out worth keeping (early access vs "does this exist"
// ambiguity matters for credibility, even on a compressed page).

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
      "ChatGPT doesn't remember which prospects you already researched, doesn't cache that research so you're not re-billed for it, and has no CRM, client portal or invoicing behind it. What you're paying for is the assembled system, not model access.",
  },
  {
    question: "Is this live yet?",
    answer:
      "Built and running internally — HamishAI's own leads, outreach and client reporting run on this exact system. It's now open for self-serve signup: start a free 7-day trial, no card required. Prefer to talk it through first? Book a call instead.",
  },
];

// A signed-in tenant landing back on their own marketing page — via a
// bookmark, a shared link, whatever — used to see "Start free trial" on
// a trial they'd already started, or "Sign up" on a plan they already
// have. Computed once here rather than per-button: every CTA on this
// page (hero, each pricing card, the closing banner) reads from the same
// three states, so they can never disagree with each other.
async function getCta(): Promise<{ label: string; href: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { label: "Start free trial", href: "/platform/signup" };

  const membership = await getOrgMembership(supabase, user.email);
  return membership ? { label: "Go to Studio", href: "/studio" } : { label: "Finish setup", href: "/platform/onboarding" };
}

export default async function HomePage() {
  const cta = await getCta();
  const signedIn = cta.href !== "/platform/signup";

  return (
    <div className="platform-typography">
      <PlatformProductJsonLd />
      {/* Same dark-video-hero DNA as the (now archived) Edinburgh homepage
          (agency/page.tsx) rather than the plain PageHero every other page
          uses — this page didn't have real photography behind it before
          (the product mockup sat on a flat light background), and per
          direct feedback it read as generic rather than premium. PageHero
          itself is untouched: it's shared by every other page (About,
          Terms, Privacy, Services...), so this hero is written out by
          hand here instead, same as agency/page.tsx's own hero.

          Video swapped 2 Sep 2026 — the Edinburgh cityscape (still used
          on /agency, where it's genuinely on-topic) was a leftover from
          before the homepage swap: appropriate for the Edinburgh
          consultancy pitch, thematically mismatched behind a
          geography-agnostic "infrastructure for AI agencies" pitch, and
          direct feedback asked for something with the same futuristic/
          techy vibe as the new heading font. Real, licensed stock footage
          (Pexels, free for commercial use, no attribution required —
          "Digital Projection of Abstract Geometrical Lines" by
          Pressmaster), hue-shifted (~+35°) from its source teal-green
          toward this site's own actual blue/cyan brand tokens
          (--gradient-blue/-cyan, globals.css) so it reads as on-brand
          rather than a generic stock clip, then re-encoded — the result
          is smaller than the Edinburgh files despite similar length,
          since abstract dark footage compresses far better than a real
          cityscape. */}
      <section className="relative isolate overflow-hidden bg-[#0d1420]">
        <ParallaxLayer speed={0.12} className="absolute inset-x-0 -top-24 h-[calc(100%+12rem)]">
          <Image
            src="/videos/hero-network-poster.jpg"
            alt="Abstract network of glowing blue connections and data points against a dark background"
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
            poster="/videos/hero-network-poster.jpg"
            aria-hidden="true"
          >
            <source src="/videos/hero-network-1080p.mp4" type="video/mp4" media="(min-width: 768px)" />
            <source src="/videos/hero-network-540p.mp4" type="video/mp4" />
          </video>
        </ParallaxLayer>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1420] via-[#0d1420]/75 to-[#0d1420]/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1420] via-transparent to-[#0d1420]/30" />

        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-28 md:pb-20">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
            <div>
              <Eyebrow className="mb-6">HamishAI Agency Platform</Eyebrow>
              <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-balance text-white md:text-6xl">
                The complete infrastructure for your own <span className="text-accent">AI agency</span>.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-balance text-white/70">
                Everything to build, sell, deliver and grow an AI service business — from your first prospect to
                your next paid client, under your own brand.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" variant="gradient" render={<Link href={cta.href} />}>
                  {cta.label}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                  render={<Link href="/analytics" />}
                >
                  See it running HamishAI itself
                  <ArrowRight className="size-4" />
                </Button>
              </div>
              {!signedIn && <p className="mt-3 text-sm text-white/50">7 days free, no card required.</p>}
            </div>
            <div className="relative">
              <HeroProductPanel />
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-t border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <Eyebrow className="mb-4">The complete journey</Eyebrow>
            <h2 className="max-w-2xl font-heading text-2xl font-semibold text-balance md:text-3xl">
              From first prospect to paid client.
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Real screenshots from a live Studio account — click through each stage.
            </p>
          </Reveal>
          <Reveal delay={100} className="mt-10">
            <StudioTour />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <Eyebrow className="mb-4">Two workspaces</Eyebrow>
          <h2 className="max-w-2xl font-heading text-2xl font-semibold text-balance md:text-3xl">
            You run the operation. Your clients experience your brand.
          </h2>
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
              Choose the agency you want to build.
            </h2>
          </Reveal>
          <Reveal delay={100} className="mt-8">
            <AgencyTypeSelector />
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
                <p className="font-heading text-lg font-semibold">Built for HamishAI. Now available to you.</p>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Built and running internally first — HamishAI&apos;s own leads, outreach and client reporting run on this exact
                  system. Now opening access to outside agencies.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
                  <Button variant="link" className="px-0" render={<Link href="/analytics" />}>
                    See AI Business Analytics
                    <ArrowRight className="size-4" />
                  </Button>
                  <Link href="/about" className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
                    Built by a Technology Business Analyst — read more
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-20 mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">Simple pricing. Serious infrastructure.</h2>
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
                    render={<Link href={signedIn ? cta.href : `/platform/signup?plan=${plan.slug}`} />}
                  >
                    {signedIn ? cta.label : "Sign up"}
                  </Button>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="max-w-3xl">
            <FaqJsonLd faqs={platformFaqs} />
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
              {signedIn ? (
                "Pick up where you left off."
              ) : (
                <>
                  Free for 7 days, no card required. Prefer to talk it through first?{" "}
                  <Link href="/book" className="underline underline-offset-2">
                    Book a call
                  </Link>{" "}
                  instead.
                </>
              )}
            </p>
          </div>
          <Button size="lg" variant="secondary" render={<Link href={cta.href} />}>
            {cta.label}
          </Button>
        </div>
      </section>
    </div>
  );
}
