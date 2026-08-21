"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Building2, Palette, CheckCircle2, Circle, Receipt, Lightbulb, ArrowRight } from "lucide-react";
import { HealthRing } from "@/components/analytics/health-ring";
import { OutreachPreview } from "@/components/platform-preview/outreach-preview";

// /platform, second pass — replaces WorkflowDiagram (a static list of
// seven cards) plus most of what "How it works", "Turn insight into
// outreach", the client-portal preview, and the report/invoice preview
// used to do as separate sections. One interactive component now tells
// the whole account → paid-client story, click-driven with a gentle
// autoplay for a passive first-time visitor.
//
// Every claim here is checked against the real Studio codebase, not
// invented: agencyName/agencyType/services/accentColor are the actual
// fields captured at onboarding (platform-onboarding.ts's
// CreateAgencyInput); niche/geography map to updateProspectingConfig's
// real categories/areas; convertProspectToClient() really is one action
// that creates the clients row AND grants portal access
// (client_members insert) in the same call — "one click" for stage 04
// is accurate, not a marketing simplification of a multi-step process.
const stages = [
  { id: "setup", number: "01", label: "Setup" },
  { id: "discover", number: "02", label: "Discover" },
  { id: "sell", number: "03", label: "Sell" },
  { id: "win", number: "04", label: "Win" },
  { id: "deliver", number: "05", label: "Deliver" },
  { id: "report", number: "06", label: "Report" },
  { id: "paid", number: "07", label: "Get paid" },
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

function SetupStage() {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Sign up, then set your agency name, type, and what you sell — this is the real onboarding form, not a
        simplification.
      </p>
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
        <CheckCircle2 className="size-3.5" /> Your agency workspace is created.
      </p>
    </div>
  );
}

function DiscoverStage() {
  return (
    <div>
      <p className="text-sm text-muted-foreground">Tell it who you&apos;re looking for. It searches for you.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="font-mono text-[9px] tracking-wide text-muted-foreground uppercase">Niche</p>
          <p className="mt-1 text-sm font-semibold">Accountants</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="font-mono text-[9px] tracking-wide text-muted-foreground uppercase">Geography</p>
          <p className="mt-1 text-sm font-semibold">Edinburgh</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
        <p className="font-heading text-3xl font-semibold text-accent tabular-nums">127</p>
        <p className="text-sm text-muted-foreground">prospects discovered — you don&apos;t research each one by hand.</p>
      </div>
    </div>
  );
}

function SellStage() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <HealthRing score={87} size={48} strokeWidth={5} centerLabel="87" />
        <div>
          <p className="text-sm font-semibold">Lomond & Grey</p>
          <p className="text-xs text-muted-foreground">Weak enquiry capture, no AI receptionist — recommended: AI Lead Generation</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">One click turns that research into a sales kit — not generic AI spam, an approach with a real reason behind it.</p>
      <div className="mt-3">
        <OutreachPreview />
      </div>
    </div>
  );
}

function WinStage() {
  const pipelineSteps = ["Contacted", "Replied", "Qualified", "Client"];
  return (
    <div>
      <p className="text-sm text-muted-foreground">Lomond & Grey moves through your pipeline.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {pipelineSteps.map((s, i) => {
          const isLast = i === pipelineSteps.length - 1;
          return (
            <div key={s} className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  isLast ? "bg-accent text-accent-foreground" : "border border-border bg-background text-muted-foreground"
                }`}
              >
                {s}
              </span>
              {!isLast && <ArrowRight className="size-3.5 shrink-0 text-border" />}
            </div>
          );
        })}
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-accent">
        <CheckCircle2 className="size-3.5" /> One action converts them to a client — their portal access is created in the same step.
      </p>
    </div>
  );
}

function DeliverStage() {
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5" style={{ backgroundColor: "var(--clay-soft)" }}>
          <span className="flex size-6 items-center justify-center rounded-md text-white" style={{ backgroundColor: "var(--clay)" }}>
            <Building2 className="size-3.5" />
          </span>
          <p className="text-xs font-semibold" style={{ color: "var(--clay)" }}>
            Lomond & Grey — Client Portal
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 p-3">
          {["Dashboard", "Analytics", "Reports", "Requests"].map((t) => (
            <span key={t} className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        They sign in to their own branded portal to see this — not HamishAI&apos;s, and never another client&apos;s.
      </p>
    </div>
  );
}

function ReportStage() {
  const metrics = [
    { label: "Leads generated", value: "24" },
    { label: "Qualified opportunities", value: "11" },
    { label: "Conversion rate", value: "8.4%" },
    { label: "AI opportunities identified", value: "7" },
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
          <span className="font-medium text-foreground">AI recommendation:</span> Response times have improved 18% this month. The
          largest remaining opportunity is follow-up automation.
        </p>
      </div>
    </div>
  );
}

function PaidStage() {
  const flow = ["Service delivered", "Results reported", "Invoice generated", "Paid"];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {flow.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{s}</span>
            {i < flow.length - 1 && <ArrowRight className="size-3.5 shrink-0 text-border" />}
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-border bg-background p-4">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Receipt className="size-3.5" />
          </span>
          <p className="text-sm font-semibold">Invoice #1042</p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Lomond & Grey</p>
        <div className="mt-2 flex items-center justify-between">
          <p className="font-heading text-xl font-semibold tabular-nums">£1,250</p>
          <span className="flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
            <CheckCircle2 className="size-3.5" /> Paid
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        The same system that won this client reports their results and bills them — not three separate tools.
      </p>
    </div>
  );
}

const stageContent: Record<StageId, () => React.ReactNode> = {
  setup: () => <SetupStage />,
  discover: () => <DiscoverStage />,
  sell: () => <SellStage />,
  win: () => <WinStage />,
  deliver: () => <DeliverStage />,
  report: () => <ReportStage />,
  paid: () => <PaidStage />,
};

export function JourneyExplorer() {
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getReducedMotionServer);
  const [active, setActive] = useState<StageId>("setup");
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
