"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Building2, Palette, CheckCircle2, Circle, Receipt, Lightbulb, ArrowRight, Sparkles } from "lucide-react";
import { HealthRing } from "@/components/analytics/health-ring";
import { Button } from "@/components/ui/button";

// /platform, third pass — six stages now (was seven): BUILD, FIND, WIN,
// DELIVER, PROVE, GROW. FIND absorbs the old "Sell" stage's AI-analysis
// card (discovery and scoring happen together in the real product —
// discoverLeads() researches every prospect it finds, confirmed against
// prospects/actions.ts — so showing them as one stage is accurate, not
// just tidier). WIN is now the fuller sales-pipeline stage the second
// pass under-explained, ending on the actual "prospect becomes a
// client" moment. GROW is new — the commercial loop doesn't stop at
// "invoice."
//
// Every claim here is checked against the real Studio codebase:
// - BUILD's fields (agency name, agency type, services, branding) are
//   the real CreateAgencyInput fields (platform-onboarding.ts).
// - Pipeline labels (Contacted/Replied/Qualified/Client) are the real
//   prospects.status values this app uses (prospecting-panel.tsx's own
//   status filter list) — "Analysed" and "Proposal" aren't real status
//   values, so they're shown as plain narrative steps in the diagram
//   text, never claimed as a status a prospect actually holds in the
//   database.
// - "One action converts them, portal access created in the same step"
//   matches convertProspectToClient()'s real behaviour (inserts the
//   clients row AND grants client_members portal access in one call).
// - Client health (GROW stage) is real — computeClientHealth()
//   (client-health.ts) is a genuine, already-shipped calculation from
//   real data (uptime, on-time payment, task completion, request
//   responsiveness), not invented for this page. The "next opportunity"
//   / expansion note is deliberately NOT presented as an automated
//   recommendation engine — no such feature exists — it's framed as
//   something the agency owner reads off the same AI insights already
//   real elsewhere on this page, not a system-generated upsell number.
const stages = [
  { id: "build", number: "01", label: "Build" },
  { id: "find", number: "02", label: "Find" },
  { id: "win", number: "03", label: "Win" },
  { id: "deliver", number: "04", label: "Deliver" },
  { id: "prove", number: "05", label: "Prove" },
  { id: "grow", number: "06", label: "Grow" },
] as const;

type StageId = (typeof stages)[number]["id"];

const AUTOPLAY_MS = 4200;

function subscribeReducedMotion(cb: () => void) {
  const q = window.matchMedia("(prefers-reduced-motion: reduce)");
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
}
function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function getReducedMotionServer() {
  return false;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function FlowChips({ steps, endLabel }: { steps: string[]; endLabel?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1;
        return (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                isLast && endLabel ? "bg-accent text-accent-foreground" : "border border-border bg-background text-muted-foreground"
              }`}
            >
              {s}
            </span>
            {!isLast && <ArrowRight className="size-3.5 shrink-0 text-border" />}
          </div>
        );
      })}
    </div>
  );
}

function BuildStage() {
  return (
    <div>
      <p className="text-sm text-muted-foreground">Sign up, then set your agency name, type and what you sell — the real onboarding form, not a simplification.</p>
      <div className="mt-4 rounded-xl border border-border bg-background p-4">
        <Field label="Agency name" value="Bright Path Digital" />
        <Field label="Agency type" value="AI Lead Generation" />
        <Field label="Services" value="Prospecting, outreach, reporting" />
        <div className="flex items-center justify-between gap-3 py-2 text-sm">
          <span className="text-muted-foreground">Branding</span>
          <span className="flex items-center gap-1.5 font-medium">
            <Palette className="size-3.5" style={{ color: "var(--gradient-violet)" }} />
            Set
          </span>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-accent">
        <CheckCircle2 className="size-3.5" /> Your agency workspace is ready.
      </p>
    </div>
  );
}

function FindStage() {
  return (
    <div>
      <p className="text-sm text-muted-foreground">Niche + geography. It searches — and tells you which businesses are actually worth pursuing.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">Edinburgh</span>
        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">Accountants</span>
        <ArrowRight className="size-3.5 self-center text-border" />
        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">127 discovered</span>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Lomond & Grey</p>
            <p className="text-xs text-muted-foreground">Website 64/100</p>
          </div>
          <HealthRing score={87} size={48} strokeWidth={5} centerLabel="87%" />
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 shrink-0 text-accent" /> AI opportunity: lead qualification automation
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Recommended service: AI Automation</p>
      </div>
    </div>
  );
}

function WinStage() {
  return (
    <div>
      <p className="text-sm text-muted-foreground">Lomond & Grey moves through the real sales pipeline.</p>
      <div className="mt-4">
        <FlowChips steps={["Discovered", "Analysed", "Contacted", "Replied", "Qualified", "Proposal", "Won"]} endLabel="Won" />
      </div>
      <div className="mt-5 rounded-xl border border-accent/40 bg-accent/5 p-4 text-center">
        <p className="font-mono text-[9px] tracking-[0.15em] text-accent uppercase">New client</p>
        <p className="mt-1 font-heading text-lg font-semibold">Lomond & Grey</p>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-accent">
          <CheckCircle2 className="size-3.5" /> One action converts them — portal access is created in the same step.
        </p>
      </div>
    </div>
  );
}

function DeliverStage() {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <FlowChips steps={["Client created", "Portal created", "Service configured", "Delivery begins"]} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-3.5">
          <p className="font-mono text-[9px] tracking-wide text-muted-foreground uppercase">Your agency workspace</p>
          <p className="mt-1.5 text-xs text-muted-foreground">Clients, services, delivery, analytics, reports and invoices — all yours to manage.</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3.5" style={{ backgroundColor: "var(--clay-soft)" }}>
          <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-wide uppercase" style={{ color: "var(--clay)" }}>
            <Building2 className="size-3" /> Their client portal
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">Their dashboard, results and reports — branded to you, never HamishAI.</p>
        </div>
      </div>
    </div>
  );
}

function ProveStage() {
  const metrics = [
    { label: "Leads generated", value: "24" },
    { label: "Qualified opportunities", value: "11" },
    { label: "Conversion rate", value: "8.4%" },
    { label: "AI opportunities", value: "7" },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-background p-3">
            <p className="font-heading text-lg font-semibold tabular-nums">{m.value}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-accent/30 bg-accent/5 p-3.5">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">AI insight:</span> Response times have improved 18%. The biggest remaining
          opportunity is follow-up automation.
        </p>
      </div>
      <Button size="sm" variant="outline" className="mt-4" disabled>
        Generate client report <ArrowRight className="size-3.5" />
      </Button>
    </div>
  );
}

function GrowStage() {
  return (
    <div>
      <FlowChips steps={["Report", "Invoice", "Paid", "Retain", "Expand"]} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Receipt className="size-3.5" />
            </span>
            <p className="text-sm font-semibold">Invoice #1042</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Lomond & Grey — Monthly retainer</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="font-heading text-xl font-semibold tabular-nums">£450</p>
            <span className="flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
              <CheckCircle2 className="size-3.5" /> Paid
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
            <span className="size-2 rounded-full bg-success" /> Client health
          </p>
          <p className="mt-1.5 text-sm font-semibold text-success">Healthy</p>
          <p className="mt-2 text-xs text-muted-foreground">Real signal — uptime, on-time payment, and how quickly requests get handled.</p>
          <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Worth a look:</span> the same AI insights that found this client can flag
            where they might need more from you next — a concept, not an automated number.
          </p>
        </div>
      </div>
    </div>
  );
}

const stageContent: Record<StageId, () => React.ReactNode> = {
  build: () => <BuildStage />,
  find: () => <FindStage />,
  win: () => <WinStage />,
  deliver: () => <DeliverStage />,
  prove: () => <ProveStage />,
  grow: () => <GrowStage />,
};

export function JourneyExplorer() {
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getReducedMotionServer);
  const [active, setActive] = useState<StageId>("build");
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    if (reducedMotion || !autoplay) return;
    const interval = setInterval(() => {
      setActive((current) => {
        const idx = stages.findIndex((s) => s.id === current);
        return stages[(idx + 1) % stages.length].id;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(interval);
  }, [reducedMotion, autoplay]);

  function selectStage(id: StageId) {
    setAutoplay(false);
    setActive(id);
  }

  const activeIndex = stages.findIndex((s) => s.id === active);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-xl shadow-black/5">
      <div className="flex gap-1 overflow-x-auto border-b border-border bg-secondary/40 px-2 py-2.5 sm:justify-between sm:px-4">
        {stages.map((s, i) => {
          const isActive = s.id === active;
          const isDone = i < activeIndex;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => selectStage(s.id)}
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

      <div className="tab-panel-enter p-5 md:p-6" key={active}>
        {stageContent[active]()}
      </div>
    </div>
  );
}
