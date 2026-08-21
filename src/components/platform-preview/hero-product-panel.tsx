"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Search, Sparkles, Send, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HealthRing } from "@/components/analytics/health-ring";
import { heroMetrics, activityFeed, aiAnalysisDemo, pipelineStages, type ActivityEventKind } from "@/lib/platform-preview-data";

// /platform hero — turns the previously-empty right side of the hero
// into a believable, animated snapshot of the actual product, not a
// generic AI illustration. Three layered cards (main analysis panel +
// two smaller peeking panels behind it) create real depth without
// glassmorphism or neon — plain shadows, borders, and offset instead.
//
// The animation is a single 5-step cycle telling one story: a prospect
// is discovered, AI analyses it, a score and recommendation appear, and
// outreach goes out — the same discover → analyse → act loop the rest
// of the page explains in words. Deliberately NOT started during SSR —
// both server and client render step 0 identically (a static, correct
// first paint), and the interval only begins in a client-only
// useEffect, so there's nothing here that can hydration-mismatch. Fully
// respects prefers-reduced-motion: reduced-motion users get the
// settled, fully-revealed end state with no timer running at all, never
// a frozen mid-animation frame.
const STEP_COUNT = 5;
const STEP_DURATION_MS = 3200;

const eventIconByKind: Record<ActivityEventKind, typeof Search> = {
  discovery: Search,
  analysis: Sparkles,
  outreach: Send,
  report: TrendingUp,
};

// useSyncExternalStore, not a useEffect + setState — the textbook-correct
// way to read a browser media query safely across SSR/hydration. The
// server snapshot is a fixed `false` (matching the deterministic step-0
// first paint everywhere else in this component), and the real value
// only takes effect once the client has actually mounted and synced —
// no hydration mismatch, and no "setState synchronously in an effect"
// lint violation (a real, pre-existing issue on the same pattern in
// health-ring.tsx, not something to copy here).
function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function getReducedMotionServerSnapshot() {
  return false;
}

function useAnimationStep() {
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % STEP_COUNT);
    }, STEP_DURATION_MS);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  return { step: reducedMotion ? STEP_COUNT - 1 : step, reducedMotion };
}

function MetricStrip({ outreachSent }: { outreachSent: boolean }) {
  return (
    <div className="grid grid-cols-4 divide-x divide-white/10 border-b border-white/10">
      {heroMetrics.map((m) => (
        <div key={m.id} className="px-3 py-3 text-center">
          <p className="font-heading text-base font-semibold text-primary-foreground tabular-nums md:text-lg">
            {m.id === "outreach" && outreachSent ? "19" : m.value}
          </p>
          <p className="mt-0.5 font-mono text-[9px] tracking-wide text-primary-foreground/50 uppercase">{m.label}</p>
        </div>
      ))}
    </div>
  );
}

function AiAnalysisCard({ step }: { step: number }) {
  const showScore = step >= 1;
  const showOpportunities = step >= 1;
  const showRecommendation = step >= 2;

  return (
    <div className="p-4 md:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] font-medium tracking-[0.15em] text-primary-foreground/50 uppercase">AI Business Analysis</p>
        {!showScore && <span className="text-[10px] text-primary-foreground/40 italic">Analysing…</span>}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <div>
          <p className="font-heading text-sm font-semibold text-primary-foreground">{aiAnalysisDemo.business}</p>
          <p className="text-[11px] text-primary-foreground/50">{aiAnalysisDemo.channel}</p>
        </div>
        <HealthRing score={showScore ? aiAnalysisDemo.score : 4} size={52} strokeWidth={5} centerLabel={showScore ? `${aiAnalysisDemo.score}` : ""} />
      </div>

      <div className="mt-3 min-h-[92px]">
        <p className="font-mono text-[9px] tracking-wide text-primary-foreground/40 uppercase">Opportunities detected</p>
        <ul className="mt-1.5 space-y-1">
          {aiAnalysisDemo.opportunities.map((o, i) => (
            <li
              key={o}
              className={`flex items-baseline gap-1.5 text-[11px] text-primary-foreground/80 transition-opacity duration-500 ${
                showOpportunities ? "opacity-100" : "opacity-0"
              }`}
              style={showOpportunities ? { transitionDelay: `${i * 120}ms` } : undefined}
            >
              <span className="font-mono text-primary-foreground/35">{String(i + 1).padStart(2, "0")}</span>
              {o}
            </li>
          ))}
        </ul>
      </div>

      <div
        className={`mt-3 border-t border-white/10 pt-3 transition-all duration-500 ${
          showRecommendation ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[9px] tracking-wide text-primary-foreground/40 uppercase">Recommended opportunity</p>
            <p className="mt-0.5 text-[11px] font-medium text-primary-foreground">{aiAnalysisDemo.recommendedService}</p>
          </div>
          <p className="font-heading text-lg font-semibold text-[var(--chart-4)] tabular-nums">{aiAnalysisDemo.opportunityScore}%</p>
        </div>
        <Button size="sm" className="mt-3 h-8 w-full gap-1.5 bg-primary-foreground text-primary hover:bg-primary-foreground/90" disabled>
          {step >= 3 ? "Outreach ready to send" : "Generate outreach"}
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ActivityFeedCard({ step, className = "" }: { step: number; className?: string }) {
  const visibleCount = Math.min(step + 1, activityFeed.length);
  const visible = activityFeed.slice(0, visibleCount).reverse();

  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-primary text-primary-foreground shadow-lg shadow-black/10 ${className}`}>
      <div className="border-b border-white/10 px-3 py-2">
        <p className="font-mono text-[9px] font-medium tracking-[0.15em] text-primary-foreground/50 uppercase">Live activity</p>
      </div>
      <ul className="space-y-0 p-2">
        {visible.map((event) => {
          const Icon = eventIconByKind[event.kind];
          return (
            <li key={event.id} className="feed-item-enter flex items-start gap-2 rounded-lg px-1.5 py-1.5">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-primary-foreground/10 text-primary-foreground/70">
                <Icon className="size-3" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] leading-tight text-primary-foreground/90">{event.label}</p>
                <p className="truncate text-[10px] leading-tight text-primary-foreground/50">{event.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PipelineFunnelCard({ pulse, className = "" }: { pulse: boolean; className?: string }) {
  const max = pipelineStages[0].value;
  return (
    <div className={`rounded-xl border border-border bg-background p-3 shadow-lg shadow-black/5 ${className}`}>
      <p className="font-mono text-[9px] font-medium tracking-[0.15em] text-muted-foreground uppercase">Opportunities</p>
      <div className="mt-2 space-y-1.5">
        {pipelineStages.map((stage) => (
          <div key={stage.id} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[10px] text-muted-foreground">{stage.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full bg-accent transition-all duration-700 ${pulse ? "opacity-100" : "opacity-90"}`}
                style={{ width: `${(stage.value / max) * 100}%` }}
              />
            </div>
            <span className="w-4 shrink-0 text-right font-mono text-[10px] tabular-nums text-foreground">{stage.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroProductPanel() {
  const { step, reducedMotion } = useAnimationStep();

  return (
    <div aria-hidden="true" className="relative mx-auto max-w-md lg:mx-0">
      {/* Background grid detail — restrained, not decorative for its own
          sake: reads as "there's real structure back there" without
          competing with the panels in front of it. */}
      <div
        className="pointer-events-none absolute inset-[-10%] -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />

      {/* Pipeline funnel — peeks from behind, bottom-left. */}
      <div className="absolute -bottom-8 -left-8 hidden lg:block">
        <PipelineFunnelCard pulse={step === STEP_COUNT - 1} className="w-64" />
      </div>

      {/* Activity feed — peeks from behind, top-right. */}
      <div className="absolute -top-7 -right-6 hidden lg:block">
        <ActivityFeedCard step={step} className="w-56" />
      </div>

      {/* Main panel. */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-primary text-primary-foreground shadow-2xl shadow-accent/10">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              {!reducedMotion && <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />}
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            <p className="font-mono text-[10px] font-medium tracking-[0.15em] text-primary-foreground/70 uppercase">HamishAI Command Centre</p>
          </div>
          <span className="hidden font-mono text-[9px] tracking-wide text-primary-foreground/35 uppercase sm:inline">
            Illustrative example
          </span>
        </div>

        <MetricStrip outreachSent={step >= 3} />
        <AiAnalysisCard step={step} />
      </div>

      {/* Mobile/tablet: the two peeking cards render in normal flow
          instead of absolute-positioned (no room to float them without
          overlap or overflow below lg), stacked under the main panel. */}
      <div className="mt-4 flex flex-col gap-4 lg:hidden">
        <ActivityFeedCard step={step} className="w-full" />
        <PipelineFunnelCard pulse={step === STEP_COUNT - 1} className="w-full" />
      </div>
    </div>
  );
}
