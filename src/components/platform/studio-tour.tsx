"use client";

import { useState, useTransition } from "react";
import { LayoutDashboard, Search, BarChart3, Sparkles, FolderKanban, Inbox, BookOpen, ArrowRight, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { completeTour } from "@/app/studio/(authed)/tour-actions";

// First-login product tour (Command Centre Phase 4, §26) — a short,
// skippable walkthrough of the parts of Studio that actually changed
// this session (Command Centre, Analytics, the Business Analyst), plus
// the standing pillars (Prospects, Projects, Requests, Knowledge).
// Deliberately seven steps, not a tour of every nav item — "don't
// bombard the user" is in the brief's own words.
//
// Studio Design Audit Tier 3 item #9 — a Prospects step is added right
// after the Command Centre intro (before Analytics) because finding
// prospects is a brand-new org's actual first real task, confirmed by
// Command Centre's own "Getting set up" checklist starting with "Run
// your first discovery search." The closing step now explicitly points
// back at that same checklist instead of ending on Knowledge, an
// unrelated topic — one coherent "what to do first" narrative instead of
// two disjoint ones (tour vs. checklist).
const STEPS = [
  {
    icon: LayoutDashboard,
    title: "Command Centre",
    description: "Your home screen — what changed, what needs your attention, and what's genuinely working, all from real data.",
  },
  {
    icon: Search,
    title: "Prospects",
    description: "Find real local businesses that fit your ideal client, then research and reach out — this is where every new client starts.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Real revenue, prospects, and client trends with period comparisons — connect more data sources here over time.",
  },
  {
    icon: Sparkles,
    title: "AI Business Analyst",
    description: "Ask about your business in plain English, from the assistant widget in the bottom-left of every page — revenue, who needs attention, what's overdue.",
  },
  {
    icon: FolderKanban,
    title: "Projects",
    description: "Track what you're delivering for each client and when it's due.",
  },
  {
    icon: Inbox,
    title: "Requests",
    description: "Everything your clients raise through their own portal, triaged and drafted for you automatically.",
  },
  {
    icon: BookOpen,
    title: "Knowledge",
    description: "Facts about each client's business — grounds their portal AI and any chatbot you put on their own website. Your first concrete steps are in the \"Getting set up\" checklist on this page — start there.",
  },
];

export function StudioTour() {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();

  function finish() {
    // Closing the dialog is a pure client-side UI action — it must never
    // depend on this network call succeeding. Found live-testing: an
    // uncaught rejection from completeTour() (it fires without checking
    // the result, unlike every other Server Action call in this app)
    // left the dialog visibly stuck open even though setOpen(false) had
    // already run. Worst case now if this save genuinely fails: the tour
    // just shows again next visit — a soft failure, never a stuck UI.
    setOpen(false);
    startTransition(() => {
      completeTour().catch(() => {});
    });
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && finish()}>
      <DialogContent showClose={false}>
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <current.icon className="size-5" />
        </span>
        <DialogTitle className="mt-3">{current.title}</DialogTitle>
        <DialogDescription>{current.description}</DialogDescription>

        <div className="mt-5 flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <span key={s.title} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-secondary"}`} />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={finish} disabled={pending}>
            Skip
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="size-3.5" /> Back
              </Button>
            )}
            <Button size="sm" disabled={pending} onClick={() => (isLast ? finish() : setStep((s) => s + 1))}>
              {isLast ? "Done" : "Next"}
              {!isLast && <ArrowRight className="size-3.5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
