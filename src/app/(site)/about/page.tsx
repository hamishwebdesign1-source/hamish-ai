import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "About | Hamish AI",
  description:
    "Hamish McFarlane — 11 years as a business analyst in financial services, now bringing AI-powered delivery to small Edinburgh businesses.",
};

const values = [
  {
    title: "No charge until you've seen it working",
    body: "Every project starts with a free consultation and a free working prototype — you decide with something real in front of you, not a pitch deck.",
  },
  {
    title: "Plain English, no jargon",
    body: "If I can't explain what something does in a sentence a business owner understands, I haven't finished the job.",
  },
  {
    title: "No lock-in",
    body: "The Growth Partnership is month-to-month, cancel anytime. Nothing here is designed to trap you into a contract.",
  },
];

const background = [
  "Data Analysis",
  "Stakeholder Management",
  "UX Design",
  "Requirements Engineering",
  "Agile",
  "Prompt Engineering",
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="An analyst who ships, not just advises."
        description="I'm Hamish McFarlane — 11 years as a business analyst in financial services, now bringing the same AI-powered delivery to small Edinburgh businesses."
      />

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="max-w-3xl">
          <Reveal>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              Why Hamish AI exists
            </h2>
          </Reveal>
          <Reveal delay={40}>
            <div className="mt-6 space-y-4 text-muted-foreground">
              <p>
                I&apos;ve spent over a decade as a business analyst inside
                NatWest Group&apos;s engineering organisation — translating
                what leadership actually needs into things that get built.
              </p>
              <p>
                In 2025, I set out to solve a real problem: technology
                leaders had no visibility into how 10,600+ engineers were
                using the company&apos;s internal knowledge-sharing forum. I
                built the answer myself — partnering with agentic AI tools
                (Claude) to go from a first-pass Power BI dashboard to a full
                production web platform, with automated data pipelines,
                workforce analytics, and one-click executive reporting.
                Acting as product owner, designer, and QA, largely on my
                own.
              </p>
              <p>
                It was adopted by senior leadership for quarterly governance,
                and surfaced over 6,000 employees who weren&apos;t using
                tools that could have helped them.
              </p>
              <p className="font-medium text-foreground">
                That&apos;s what convinced me: someone who understands a
                business, paired with the right AI tools, can now deliver
                what used to take a whole team. Most small businesses
                don&apos;t have an internal engineering department to do that
                for them — Hamish AI exists to bring that same capability to
                them.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              How I work
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 80}>
                <div className="card-interactive h-full rounded-lg border border-border bg-background p-5">
                  <h3 className="font-heading text-lg font-medium">{v.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">
            Background
          </h2>
          <p className="mt-2 max-w-lg text-muted-foreground">
            Business analysis and delivery skills built over 11 years in
            financial services, now applied to small business AI projects.
          </p>
        </Reveal>
        <Reveal delay={40}>
          <div className="mt-6 flex flex-wrap gap-2">
            {background.map((t) => (
              <Badge key={t} variant="secondary" className="px-3 py-1.5 text-sm">
                {t}
              </Badge>
            ))}
          </div>
        </Reveal>
        <Reveal delay={60}>
          <a
            href="https://linkedin.com/in/hamish-mcfarlane"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            Connect on LinkedIn →
          </a>
        </Reveal>
      </section>

      <section className="border-t border-border/60 bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between md:py-20">
          <div>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              Want to talk it through?
            </h2>
            <p className="mt-2 text-primary-foreground/70">
              No charge, no obligation — just a free consultation and a
              working example.
            </p>
          </div>
          <Button size="lg" variant="gradient" render={<Link href="/book" />}>
            Book a free AI consultation
          </Button>
        </div>
      </section>
    </>
  );
}
