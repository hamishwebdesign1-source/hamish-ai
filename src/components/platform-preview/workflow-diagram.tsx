import { Search, Sparkles, Send, MessagesSquare, Users, ChartColumn, Receipt, ArrowRight, ArrowDown } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { Eyebrow } from "@/components/eyebrow";

// The strong transition the brief calls for, right after the hero: one
// connected system, not seven unrelated features. Deliberately its own
// section rather than a rename of the existing "How it works" 5-card
// grid further down this page — that section stays as the fuller,
// descriptive follow-up; this one is the compact system map that makes
// the shape of the whole loop legible at a glance, closing the loop the
// hero panel's own discover → analyse → act animation opened.
const workflowSteps = [
  { id: "discover", label: "Discover", icon: Search, description: "Find prospects in your niche and geography." },
  { id: "analyse", label: "Analyse", icon: Sparkles, description: "Score what's weak, missing, worth pursuing." },
  { id: "outreach", label: "Outreach", icon: Send, description: "Email, call script and LinkedIn, sent as you." },
  { id: "convert", label: "Convert", icon: MessagesSquare, description: "Replies land in one inbox, not four." },
  { id: "deliver", label: "Deliver", icon: Users, description: "Do the work, in your own branded portal." },
  { id: "report", label: "Report", icon: ChartColumn, description: "A client-facing report from the same data." },
  { id: "paid", label: "Get paid", icon: Receipt, description: "An invoice generated from the same job." },
];

export function WorkflowDiagram() {
  return (
    <section className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <Eyebrow className="mb-4">One operating system</Eyebrow>
          <h2 className="max-w-2xl font-heading text-2xl font-semibold text-balance md:text-3xl">
            Everything you need to run the agency.
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Seven stages, one workspace — each one hands its output straight to the next, not seven separate
            tools you have to keep in sync yourself.
          </p>
        </Reveal>

        {/* Desktop: one connected horizontal row. Mobile: a vertical
            chain — same connective arrows, different axis, never just
            the desktop layout shrunk down. */}
        <div className="mt-10 hidden lg:flex lg:items-stretch lg:gap-0">
          {workflowSteps.map((step, i) => (
            <Reveal key={step.id} delay={i * 70} className="flex flex-1 items-stretch">
              <div className="flex flex-1 items-center">
                <div className="card-interactive flex h-full flex-1 flex-col items-center rounded-2xl border border-border bg-background p-4 text-center">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <step.icon className="size-4.5" />
                  </span>
                  <p className="mt-3 font-heading text-sm font-semibold">{step.label}</p>
                  <p className="mt-1.5 text-[11px] text-balance text-muted-foreground">{step.description}</p>
                </div>
                {i < workflowSteps.length - 1 && <ArrowRight className="mx-2 size-4 shrink-0 text-border" />}
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-0 lg:hidden">
          {workflowSteps.map((step, i) => (
            <Reveal key={step.id} delay={i * 70} className="w-full max-w-sm">
              <div className="card-interactive flex items-center gap-4 rounded-2xl border border-border bg-background p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <step.icon className="size-4.5" />
                </span>
                <div>
                  <p className="font-heading text-sm font-semibold">{step.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
              {i < workflowSteps.length - 1 && <ArrowDown className="mx-auto my-1.5 size-4 text-border" />}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
