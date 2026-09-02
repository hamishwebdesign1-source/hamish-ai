"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Search, Sparkles, Globe, Users, Receipt, BookOpen, ChartColumn } from "lucide-react";

// Real product screenshots, not the hand-built mockup this replaced (the
// old JourneyExplorer — deleted alongside this file landing). Captured
// live from an actual signed-in Studio account via a full walkthrough
// (2 Sep 2026) and extracted frame-by-frame with ffmpeg from the
// resulting recording — every image below is a real, un-edited screen
// from the real app, not a recreation. Direct feedback ("the whole page
// feels very amateur... screenshots of /studio explaining the journey")
// is what this exists to answer.
//
// Six stages, not the old JourneyExplorer's six (Build/Find/Win/Deliver/
// Prove/Grow) — deliberately not force-fitted onto that framework. These
// are only the screens a real walkthrough actually captured; "Win" (the
// sales pipeline mid-stage) and "Grow" (invoicing) aren't shown here
// because no real screenshot of them exists yet, and a caption
// describing a screen that isn't there would be exactly the kind of
// thing this whole fix is meant to stop doing. Every caption below only
// describes what is visibly on screen in its own image.
//
// "Analyse" (02) added 2 Sep 2026, same session — captured live via
// Claude in Chrome from the real, signed-in production account
// (hamishai.org/studio/prospects), the same prospect already shown in
// Find's own screenshot (La Salle de Sport Paris Madeleine), expanded to
// its real Research tab.
//
// Deliver's screenshot recaptured, and Charge (05) added, later the same
// day — the original Deliver capture showed Clients' empty state ("No
// clients yet"), because at the time that screenshot was taken, a real
// production bug (an RLS policy recursion — fixed via direct SQL, not in
// this repo) meant converted clients genuinely couldn't be read back,
// even though they existed. Once that was fixed and confirmed live, both
// this step's screenshot and Charge's were captured fresh — Deliver now
// shows the real, populated Clients list, and Charge shows the real
// per-client Invoices section, honestly reflecting Stripe not being
// connected yet rather than staging a fake connected state.
const steps = [
  {
    id: "find",
    number: "01",
    label: "Find",
    icon: Search,
    image: "/images/platform/studio-tour/01-find-prospects.png",
    heading: "Find prospects worth pursuing",
    body: "Search a niche and a location, or add a lead by hand — every prospect that comes in gets a real score out of 5 and a verification flag, not a guess.",
    alt: "Studio's Prospects screen: a location and category search form above a scored list of real leads — W Fitness (5/5), La Salle de Sport Paris Madeleine (4/5), Mufti Hairdressing (4/5) and Argus Fish Bar (4/5) — each marked Needs Verification.",
  },
  {
    id: "analyse",
    number: "02",
    label: "Analyse",
    icon: Sparkles,
    image: "/images/platform/studio-tour/02-analyse-research.png",
    heading: "See exactly why the AI scored them",
    body: "Every prospect gets a full breakdown — fit, need, value and confidence, a plain-English reason to pursue them, and the real weaknesses and opportunities found on their existing site.",
    alt: "Studio's Research tab for La Salle de Sport Paris Madeleine, scored 4/5: Fit 5/5, Need 5/5, Value 4/5, Confidence 3/5, a 'Why pursue this one' explanation, an estimated £3,000–£6,000 project value with Medium Conversion Probability and High AI Fit, and lists of weaknesses, strengths and AI opportunities.",
  },
  {
    id: "build",
    number: "03",
    label: "Build",
    icon: Globe,
    image: "/images/platform/studio-tour/03-build-website.png",
    heading: "Build the client's website with AI",
    body: "Studio doesn't host or build the site for you — it hands you the brief and the step-by-step AI instructions to build it yourself with Claude Code, Cursor, or Codex, with guides for each built in.",
    alt: "Studio's Website Builder screen, showing the full sidebar (Command Centre, Analytics, Prospects, Campaigns, Website Builder, Clients, Requests, Projects, Knowledge), a Create Website Project button, and AI coding tool guide cards for Claude Code, Cursor and OpenAI Codex.",
  },
  {
    id: "deliver",
    number: "04",
    label: "Deliver",
    icon: Users,
    image: "/images/platform/studio-tour/04-deliver-clients.png",
    heading: "Deliver through a branded client portal",
    body: "Convert a prospect and they get their own portal login — under your agency's name, never Studio's.",
    alt: "Studio's Clients screen showing 3 real clients: W Fitness, La Salle de Sport Paris Madeleine, and a demo client, each with their own portal login at hamishai.org/portal, branded to the agency.",
  },
  {
    id: "charge",
    number: "05",
    label: "Charge",
    icon: Receipt,
    image: "/images/platform/studio-tour/05-charge-invoices.png",
    heading: "Invoice clients through your own Stripe account",
    body: "Connect your own Stripe account once in Settings, then invoice any client directly from their card — payments go straight to you, not through Studio.",
    alt: "Studio's Invoices section on a client's card, reading 'Connect Stripe in Settings before you can invoice this client' — the real prompt shown before a Stripe account is connected.",
  },
  {
    id: "support",
    number: "06",
    label: "Support",
    icon: BookOpen,
    image: "/images/platform/studio-tour/06-support-knowledge.png",
    heading: "Power client support with a knowledge base",
    body: "Add facts about a client's business once, and their own AI support agent can answer instantly instead of every question turning into a request.",
    alt: "Studio's Knowledge base screen, with Add entry and Import from document buttons above an empty state explaining that entries power clients' AI Copilot and support agent.",
  },
  {
    id: "measure",
    number: "07",
    label: "Measure",
    icon: ChartColumn,
    image: "/images/platform/studio-tour/07-measure-performance.png",
    heading: "See real AI usage, not a projection",
    body: "Every AI call your agency makes — success rate, latency, and cost — tracked from your own Command Centre, alongside a setup checklist for what's still left to do.",
    alt: "Studio's Command Centre performance panel: 100% success rate, 1.6s median latency, and an estimated 30-day cost of £0.01 across 4 calls, broken down by AI Business Analyst and Studio AI Assistant, above a Getting Set Up checklist.",
  },
] as const;

type StepId = (typeof steps)[number]["id"];

export function StudioTour() {
  const [active, setActive] = useState<StepId>("find");
  const activeIndex = steps.findIndex((s) => s.id === active);
  const activeStep = steps[activeIndex];

  function go(delta: number) {
    const next = (activeIndex + delta + steps.length) % steps.length;
    setActive(steps[next].id);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-xl shadow-black/5">
      <div className="flex gap-1 overflow-x-auto border-b border-border bg-secondary/40 px-2 py-2.5 sm:justify-between sm:px-4">
        {steps.map((s, i) => {
          const isActive = s.id === active;
          const isDone = i < activeIndex;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                isActive ? "bg-accent text-accent-foreground" : isDone ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              {isActive ? <span className="font-mono">{s.number}</span> : isDone ? <CheckCircle2 className="size-3" /> : <Circle className="size-3" />}
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="tab-panel-enter grid gap-0 lg:grid-cols-[1.4fr_1fr]" key={active}>
        <div className="relative aspect-[1568/745] border-b border-border bg-secondary/60 lg:border-r lg:border-b-0">
          <Image
            src={activeStep.image}
            alt={activeStep.alt}
            fill
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="object-cover object-top"
          />
          <span className="absolute top-3 left-3 rounded-full bg-background/90 px-2.5 py-1 font-mono text-[9px] tracking-[0.15em] text-muted-foreground uppercase shadow-sm backdrop-blur">
            Real Studio screenshot
          </span>
        </div>

        <div className="flex flex-col p-5 md:p-6">
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <activeStep.icon className="size-4.5" />
          </span>
          <p className="mt-3 font-heading text-base font-semibold">{activeStep.heading}</p>
          <p className="mt-2 text-sm text-muted-foreground">{activeStep.body}</p>

          <div className="mt-auto flex items-center justify-between gap-3 pt-6">
            <button
              type="button"
              onClick={() => go(-1)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Back
            </button>
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {activeIndex + 1} / {steps.length}
            </span>
            <button
              type="button"
              onClick={() => go(1)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Next <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
