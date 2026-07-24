import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  FileText,
  TrendingUp,
  Workflow,
  Globe,
  MessageCircle,
  Database,
  Brain,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { Eyebrow } from "@/components/eyebrow";
import { HowItWorksFlow } from "@/components/case-study/how-it-works-flow";
import { KpiCard } from "@/components/analytics/kpi-card";
import { DashboardDemo } from "@/components/analytics/dashboard-demo";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { dashboardKpis, analyticsIndustries, analyticsFaqs } from "@/lib/analytics-data";

export const metadata: Metadata = {
  title: "AI Business Analytics | Hamish AI",
  description:
    "Executive dashboards, automated AI reports, and business intelligence for Edinburgh businesses — built by a Technology Business Analyst who understands the process behind the data.",
};

const problems = [
  {
    title: "Data lives in five different places",
    body: "Booking system, POS, spreadsheets, gut feeling — nothing talks to each other, so nobody has the full picture.",
  },
  {
    title: "You find out about a bad month a month too late",
    body: "By the time the figures are pulled together, the moment to actually act on them has already passed.",
  },
  {
    title: "No one has time to build a report every week",
    body: "Manually exporting spreadsheets and building slides eats hours that could go into running the business.",
  },
];

const included = [
  {
    icon: BarChart3,
    title: "Executive Dashboards",
    body: "Real-time KPI tracking built around what actually matters to your business, not a generic template.",
  },
  {
    icon: FileText,
    title: "Automated AI Reports",
    body: "Plain-English weekly or monthly summaries land in your inbox — no spreadsheet required.",
  },
  {
    icon: TrendingUp,
    title: "Business Intelligence",
    body: "Customer, sales, and marketing analytics that spot trends before you'd notice them yourself.",
  },
  {
    icon: Workflow,
    title: "Process Improvement",
    body: "As a business analyst first, every dashboard starts with understanding how your business actually runs.",
  },
];

const workflowSteps = [
  { icon: Globe, label: "Website" },
  { icon: MessageCircle, label: "AI Chatbot" },
  { icon: Database, label: "Data Collection" },
  { icon: Brain, label: "AI Analysis" },
  { icon: FileText, label: "Automated Reports" },
  { icon: Lightbulb, label: "Business Recommendations" },
  { icon: TrendingUp, label: "Business Growth" },
];

export default function AnalyticsPage() {
  return (
    <>
      <PageHero
        eyebrow="AI Business Analytics"
        title="Turn your business data into decisions."
        description="Most small businesses collect more data than they realise — bookings, enquiries, sales, website visits — but never turn it into anything actionable. We build the dashboards, reports, and AI insights that close that gap."
        visual={
          <div className="mx-auto max-w-sm space-y-4">
            <KpiCard kpi={dashboardKpis[0]} />
            <KpiCard kpi={dashboardKpis[6]} compact />
          </div>
        }
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" variant="gradient" render={<Link href="/book" />}>
            Book a free AI consultation
            <ArrowRight className="size-4" />
          </Button>
          <Button size="lg" variant="outline" render={<Link href="#dashboard-demo" />}>
            See it in action
          </Button>
        </div>
      </PageHero>

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

      <section id="dashboard-demo" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="max-w-2xl">
              <h2 className="font-heading text-2xl font-semibold md:text-3xl">
                See it in action
              </h2>
              <p className="mt-2 text-muted-foreground">
                A live, working preview of the kind of executive dashboard we
                build — click regenerate to see a different set of AI
                insights.
              </p>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <div className="mt-10">
              <DashboardDemo />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              What's included
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {included.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="card-interactive group h-full rounded-xl border border-border bg-background p-6">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-accent-foreground">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-heading text-lg font-medium">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <HowItWorksFlow
        steps={workflowSteps}
        title="How it fits together"
        description="Analytics doesn't replace your website and chatbot — it closes the loop on them, turning every visit and every conversation into a decision."
      />

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <Eyebrow className="mb-3">Built for your industry</Eyebrow>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              What we'd track for a business like yours.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {analyticsIndustries.map((ind, i) => (
              <Reveal key={ind.slug} delay={i * 60}>
                <Link
                  href={`/portfolio/${ind.slug}`}
                  className="card-interactive group flex h-full flex-col gap-3 rounded-xl border border-border bg-background p-6"
                >
                  <span className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <ind.icon className="size-5" />
                  </span>
                  <span className="font-heading text-base font-medium">{ind.name}</span>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {ind.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                    See case study
                    <ArrowRight className="size-3" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="max-w-3xl">
            <Reveal>
              <h2 className="font-heading text-2xl font-semibold md:text-3xl">
                Analytics questions
              </h2>
            </Reveal>
            <Reveal delay={40}>
              <Accordion className="mt-8">
                {analyticsFaqs.map((faq) => (
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
              Ready to see what your data is actually telling you?
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
