import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { HelpFaqList } from "@/components/platform/help-faq-list";
import { STUDIO_FAQS } from "@/lib/studio-help-faqs";
import { FaqJsonLd } from "@/components/seo/faq-json-ld";

// Public documentation launch (2026-09-06 mission, see
// docs/ai-team/DECISIONS.md's matching entry and BACKLOG.md's "Public
// /help page" entry for the full IA reasoning) — the marketing site had
// no public, unauthenticated documentation between the homepage's pitch
// and the authenticated app's own /studio/help and /portal/help. One
// real page, not a docs site: a getting-started walkthrough grounded in
// the actual product flow, the same 24-entry STUDIO_FAQS already
// maintained for Studio (republished verbatim, not forked — it's already
// descriptive product documentation, not written assuming the reader is
// mid-session), and plain links to the existing /terms and /privacy.
export const metadata: Metadata = {
  title: "Help | Hamish AI",
  description:
    "How the Agency Platform actually works — prospecting, sales kits, client delivery, billing — plus a step-by-step guide to getting started, before you sign up.",
  alternates: { canonical: "/help" },
};

// Cross-checked against real product flow, not invented: the Command
// Centre's own "Getting set up" checklist (studio/(authed)/page.tsx —
// run a discovery search, convert a prospect to a client, connect
// Stripe) and StudioTour's real 7 captured steps (platform-preview/
// studio-tour.tsx). Set ICP / sales kit / invite team are grounded in
// STUDIO_FAQS's own "How does prospecting work?", "What's a sales kit?"
// and "Can I add other people to my team?" entries below, not new claims.
const gettingStartedSteps = [
  {
    step: "1",
    title: "Start your free trial",
    body: "Sign up for a 7-day free trial — no card required. You land straight in Studio, your agency's own workspace.",
  },
  {
    step: "2",
    title: "Set your ideal client",
    body: "In Prospects, set the categories and areas that match who you actually want as clients — this is what every discovery search runs against.",
  },
  {
    step: "3",
    title: "Run your first discovery search",
    body: "The AI finds real matching businesses, researches each one, and scores it on fit, need, value and confidence — every score explained, never a guessed number.",
  },
  {
    step: "4",
    title: "Generate a sales kit",
    body: "Pick a prospect worth pursuing and generate a sales kit in one call: an outreach email, follow-up, call script, LinkedIn message, meeting agenda and proposal outline, all grounded in the research already done.",
  },
  {
    step: "5",
    title: "Convert a prospect to a client",
    body: "Once they say yes, convert them — it creates a client record, a branded portal login, and a real 14-day Onboarding project. Nothing is billed automatically.",
  },
  {
    step: "6",
    title: "Invite your team",
    body: "Add teammates from Settings. Once there's more than one of you, requests, prospects, projects and Website Builder projects can each be assigned to someone.",
  },
  {
    step: "7",
    title: "Connect Stripe for client billing",
    body: "Connect your own Stripe account in Settings so payments go straight to you. Once connected, invoice any client directly from their card, one-off or as a real recurring subscription.",
  },
];

// STUDIO_FAQS uses {q, a}; FaqJsonLd's shared schema expects
// {question, answer} — same mapping already done for every other real
// FaqJsonLd caller (homepage, /services). Nothing here is a second copy
// of the content, just a shape adapter for the JSON-LD script.
const helpFaqJsonLd = STUDIO_FAQS.map((f) => ({ question: f.q, answer: f.a }));

export default function HelpPage() {
  return (
    <>
      <FaqJsonLd faqs={helpFaqJsonLd} />
      <PageHero
        eyebrow="Help"
        title="Everything you need to know, before and after you sign up."
        description="How prospecting, sales kits, client delivery and billing actually work on the Agency Platform — real documentation, not a sales pitch."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Button render={<Link href="/platform/signup" />}>Start free trial</Button>
          <Button variant="outline" render={<Link href="/book" />}>
            Book a call instead
          </Button>
        </div>
      </PageHero>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">Getting started</h2>
          <p className="mt-2 max-w-lg text-muted-foreground">
            The real path from signing up to your first invoice — seven steps, nothing skipped.
          </p>
        </Reveal>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {gettingStartedSteps.map((s, i) => (
            <Reveal key={s.step} delay={i * 60}>
              <li className="card-interactive h-full rounded-lg border border-border bg-background p-5">
                <span className="flex size-8 items-center justify-center rounded-full bg-accent/10 font-mono text-sm text-accent">
                  {s.step}
                </span>
                <h3 className="mt-4 font-heading text-lg font-medium">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
          <Reveal>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              Frequently asked questions
            </h2>
            <p className="mt-2 text-muted-foreground">
              Every real question we get about running an agency on this platform — search or
              browse below.
            </p>
          </Reveal>
          <Reveal delay={40}>
            <div className="mt-8">
              <HelpFaqList faqs={STUDIO_FAQS} />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">Legal & data</h2>
          <p className="mt-2 max-w-lg text-muted-foreground">
            No new legal content here — just where the real policies already live.
          </p>
          <div className="mt-6 flex flex-wrap gap-6">
            <Link href="/terms" className="text-accent underline underline-offset-4 hover:text-accent/80">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-accent underline underline-offset-4 hover:text-accent/80">
              Privacy Policy
            </Link>
          </div>
        </Reveal>
      </section>

      <section className="border-t border-border/60 bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between md:py-20">
          <div>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              Still have a question?
            </h2>
            <p className="mt-2 max-w-lg text-primary-foreground/70">
              Email{" "}
              <a href="mailto:hello@hamishai.org" className="underline underline-offset-2">
                hello@hamishai.org
              </a>{" "}
              — real questions become real FAQ entries.
            </p>
          </div>
          <Button size="lg" variant="secondary" render={<Link href="/platform/signup" />}>
            Start free trial
          </Button>
        </div>
      </section>
    </>
  );
}
