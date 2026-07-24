import { Fragment } from "react";
import {
  MessageCircleQuestion,
  Brain,
  Database,
  Sparkles,
  CalendarCheck,
  Bell,
  ArrowRight,
  ArrowDown,
  type LucideIcon,
} from "lucide-react";

const defaultSteps: { icon: LucideIcon; label: string }[] = [
  { icon: MessageCircleQuestion, label: "Customer asks a question" },
  { icon: Brain, label: "AI understands intent" },
  { icon: Database, label: "Knowledge base searched" },
  { icon: Sparkles, label: "Response generated" },
  { icon: CalendarCheck, label: "Booking created" },
  { icon: Bell, label: "Business notified" },
];

export function HowItWorksFlow({
  steps = defaultSteps,
}: {
  steps?: { icon: LucideIcon; label: string }[];
}) {
  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="max-w-2xl">
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">
            How it actually works
          </h2>
          <p className="mt-2 text-muted-foreground">
            From the moment a customer types a question, to the business
            getting notified — end to end, automatically.
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-2">
          {steps.map((step, i) => (
            <Fragment key={step.label}>
              <div className="flex items-center gap-4 lg:flex-1 lg:flex-col lg:items-center lg:gap-3 lg:text-center">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-background text-accent shadow-sm">
                  <step.icon className="size-5" />
                </span>
                <p className="text-sm font-medium">{step.label}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex items-center justify-center pl-6 text-muted-foreground/30 lg:mt-6 lg:pl-0">
                  <ArrowDown className="size-4 lg:hidden" />
                  <ArrowRight className="hidden size-4 lg:block" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
