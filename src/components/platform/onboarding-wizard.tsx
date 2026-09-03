"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { Check, Sparkles, CreditCard, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/eyebrow";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { platformPlans, formatMonthlyPrice, type PlatformPlanSlug } from "@/lib/platform-plans";
import { AGENCY_TYPES } from "@/lib/agency-types";
import { submitOnboarding } from "@/app/platform/onboarding/actions";

// Steps 2–6 of the Agency Platform onboarding flow (step 1, sign up, is
// already done by the time this renders — see page.tsx's server-side
// gate). Collected in local state and submitted together as one write in
// createAgencyOrganisation(), rather than persisted step by step — there's
// no partial-org state to resume here, and a half-finished signup is
// simplest as "didn't happen yet," not a row to clean up later.
//
// No file upload for a logo yet, deliberately — an accent colour is the
// one piece of branding worth asking for in a wizard this early; a real
// logo upload is worth building once /studio actually renders it
// somewhere, not before.
//
// AGENCY_TYPES itself now lives in agency-types.ts (Studio big-ticket,
// "agency-type templates correctness gap") — the exact same three
// options, just importable server-side too, so draft-sales-kit.ts can
// shape a tenant's own outreach voice around whichever one they picked.

type Step = "start" | "name" | "type" | "services" | "branding" | "review";
const STEPS: Step[] = ["start", "name", "type", "services", "branding", "review"];

// Pricing-promise audit (2026-09-02) — platform-plans.ts's own features
// list promises "1 agency type template" (Starter), "2 to 3" (Professional),
// "All" (Agency), but nothing anywhere actually restricted which of the 3
// AGENCY_TYPES a tenant could pick — every plan saw and could select all
// 3. Gates the "type" step by count, in AGENCY_TYPES' own declared order
// (analytics, automation, lead-generation) — not a new ranking invented
// here, just the array's existing order. Keyed off `selectedPlan`, not a
// server-fetched org.plan: this step runs before the org even exists, and
// selectedPlan already reflects the plan the tenant actually clicked into
// signup with (see its own declaration above), which is the real signal
// of intent here, not the "starts on Starter" trial default.
const AGENCY_TYPE_COUNT_FOR_PLAN: Record<PlatformPlanSlug, number> = {
  starter: 1,
  professional: 2,
  agency: 3,
};

export function OnboardingWizard({ email, initialPlan }: { email: string; initialPlan: PlatformPlanSlug | null }) {
  const [step, setStep] = useState<Step>("start");
  // "trial" is the default regardless of whether a plan arrived via
  // ?plan= from a pricing-card click (see onboarding/page.tsx) — clicking
  // a specific plan's "Sign up" button means "I want this plan," not "I
  // want to skip the trial"; selectedPlan just pre-fills the pay-now
  // choice below in case they do switch to it.
  const [startMode, setStartMode] = useState<"trial" | "pay-now">("trial");
  const [selectedPlan, setSelectedPlan] = useState<PlatformPlanSlug>(initialPlan ?? "professional");
  const [agencyName, setAgencyName] = useState("");
  const [agencyType, setAgencyType] = useState<(typeof AGENCY_TYPES)[number]["slug"] | null>(null);
  const [expandedType, setExpandedType] = useState<(typeof AGENCY_TYPES)[number]["slug"] | null>(null);
  const [services, setServices] = useState<string[]>([]);
  const [accentColor, setAccentColor] = useState("#2b5d59");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);
  const unlockedTypeCount = AGENCY_TYPE_COUNT_FOR_PLAN[selectedPlan];
  // Derived, not effect-driven — a real, reachable edge case: pick a type
  // only Agency unlocks, click back, switch to Starter. Rather than a
  // useEffect calling setAgencyType(null) (a synchronous-setState-in-
  // effect anti-pattern this codebase's own lint config flags), a
  // now-locked selection just stops counting as selected wherever
  // selectedType is read below — no separate reset needed, and clicking
  // a still-unlocked card overwrites the stale slug in state normally.
  const rawSelectedType = AGENCY_TYPES.find((t) => t.slug === agencyType);
  const rawSelectedIndex = rawSelectedType ? AGENCY_TYPES.indexOf(rawSelectedType) : -1;
  const selectedType = rawSelectedIndex >= 0 && rawSelectedIndex >= unlockedTypeCount ? undefined : rawSelectedType;

  // Studio Design Audit Tier 5 item #15 — this wizard had zero client-side
  // instrumentation, so pre-signup drop-off (which step a prospective
  // tenant abandoned at) was invisible. Guarded the same way
  // identify-org.tsx guards its own PostHog call, so this stays a no-op
  // in any environment without the key configured.
  function next() {
    if (stepIndex < STEPS.length - 1) {
      const nextStep = STEPS[stepIndex + 1];
      setStep(nextStep);
      if (process.env.NEXT_PUBLIC_POSTHOG_KEY) posthog.capture("onboarding_step_viewed", { step: nextStep });
    }
  }
  function back() {
    if (stepIndex > 0) {
      const prevStep = STEPS[stepIndex - 1];
      setStep(prevStep);
      if (process.env.NEXT_PUBLIC_POSTHOG_KEY) posthog.capture("onboarding_step_viewed", { step: prevStep });
    }
  }
  function toggleService(service: string) {
    setServices((prev) => (prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]));
  }

  async function handleCreate() {
    setStatus("submitting");
    setErrorMessage(null);
    const result = await submitOnboarding({
      email,
      agencyName,
      agencyType: selectedType?.name ?? "AI Analytics",
      services,
      accentColor,
      startMode,
      selectedPlan: startMode === "pay-now" ? selectedPlan : null,
    });
    // A successful call redirect()s server-side and never returns here —
    // reaching this line means it didn't.
    if (result && "error" in result) {
      setStatus("error");
      setErrorMessage(result.error);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-6 py-12">
      <Card className="w-full max-w-lg p-2">
        <CardContent>
          <Eyebrow>Set up your agency · Step {stepIndex + 1} of {STEPS.length}</Eyebrow>

          {step === "start" && (
            <>
              <h1 className="mt-3 font-heading text-2xl font-semibold">How would you like to start?</h1>
              <p className="mt-2 text-sm text-muted-foreground">You can switch any time from Studio &gt; Billing — this just decides today.</p>
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => setStartMode("trial")}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                    startMode === "trial" ? "border-accent/60 bg-accent/5" : "border-border hover:bg-secondary/40"
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Sparkles className="size-4" />
                  </span>
                  <span>
                    <span className="block font-heading text-sm font-semibold">7-day free trial</span>
                    <span className="block text-xs text-muted-foreground">Full access, no card required. Decide on a plan later.</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setStartMode("pay-now")}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                    startMode === "pay-now" ? "border-accent/60 bg-accent/5" : "border-border hover:bg-secondary/40"
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <CreditCard className="size-4" />
                  </span>
                  <span>
                    <span className="block font-heading text-sm font-semibold">Subscribe now</span>
                    <span className="block text-xs text-muted-foreground">Skip the trial, pick a plan, and start straight away.</span>
                  </span>
                </button>
              </div>

              {startMode === "pay-now" && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {platformPlans.map((plan) => (
                    <button
                      key={plan.slug}
                      type="button"
                      onClick={() => setSelectedPlan(plan.slug)}
                      className={cn(
                        "rounded-lg border p-2.5 text-center transition-colors",
                        selectedPlan === plan.slug ? "border-accent/60 bg-accent/5" : "border-border hover:bg-secondary/40"
                      )}
                    >
                      <p className="text-xs font-semibold">{plan.name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{formatMonthlyPrice(plan.monthlyPence)}/mo</p>
                    </button>
                  ))}
                </div>
              )}

              <Button className="mt-6 w-full" onClick={next}>
                Continue
              </Button>
            </>
          )}

          {step === "name" && (
            <>
              <h1 className="mt-3 font-heading text-2xl font-semibold">What&apos;s your agency called?</h1>
              <p className="mt-2 text-sm text-muted-foreground">This becomes your workspace name — you can change it later.</p>
              <div className="mt-6 space-y-2">
                <Label htmlFor="agency-name">Agency name</Label>
                <Input
                  id="agency-name"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="e.g. Edinburgh AI Solutions"
                  autoFocus
                  className="h-10"
                />
              </div>
              <Button className="mt-6 w-full" disabled={!agencyName.trim()} onClick={next}>
                Continue
              </Button>
            </>
          )}

          {step === "type" && (
            <>
              <h1 className="mt-3 font-heading text-2xl font-semibold">What does your agency sell?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This shapes how prospecting and reporting work for you — pick the closest fit.
              </p>
              <div className="mt-6 space-y-2">
                {AGENCY_TYPES.map((type, i) => {
                  const locked = i >= unlockedTypeCount;
                  return (
                  <div
                    key={type.slug}
                    className={cn(
                      "w-full rounded-xl border transition-colors",
                      locked
                        ? "border-border opacity-60"
                        : agencyType === type.slug
                          ? "border-accent/60 bg-accent/5"
                          : "border-border hover:bg-secondary/40"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => !locked && setAgencyType(type.slug)}
                      disabled={locked}
                      className={cn("w-full p-4 text-left", locked && "cursor-not-allowed")}
                    >
                      <p className="flex items-center gap-2 font-heading text-sm font-semibold">
                        {type.name}
                        {locked && (
                          <Badge variant="secondary" className="gap-1 font-mono text-[10px] font-normal">
                            <Lock className="size-2.5" /> {platformPlans[i].name} plan
                          </Badge>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{type.description}</p>
                    </button>
                    {/* Content enrichment pass — a one-line description isn't
                        enough to actually choose a business model from, but
                        showing all 4 bullets for all 3 cards at once would
                        make this step overwhelming. Expand/collapse per card,
                        sibling of the select button above (not nested inside
                        it) — same reasoning every other checkbox-inside-a-
                        clickable-row fix elsewhere in this app documents. */}
                    <button
                      type="button"
                      onClick={() => setExpandedType((prev) => (prev === type.slug ? null : type.slug))}
                      aria-expanded={expandedType === type.slug}
                      className="flex w-full items-center gap-1 px-4 pb-3 text-[11px] font-medium text-accent"
                    >
                      {expandedType === type.slug ? (
                        <>
                          <ChevronUp className="size-3" /> Hide how this works
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-3" /> How does this work?
                        </>
                      )}
                    </button>
                    {expandedType === type.slug && (
                      <ul className="space-y-1.5 border-t border-border px-4 py-3 text-xs text-muted-foreground">
                        {type.howItWorks.map((point) => (
                          <li key={point} className="flex gap-2">
                            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  );
                })}
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={back}>Back</Button>
                <Button className="flex-1" disabled={!selectedType} onClick={next}>Continue</Button>
              </div>
            </>
          )}

          {step === "services" && selectedType && (
            <>
              <h1 className="mt-3 font-heading text-2xl font-semibold">Which services do you offer?</h1>
              <p className="mt-2 text-sm text-muted-foreground">Pick as many as apply — you can add more later.</p>
              <div className="mt-6 space-y-2">
                {selectedType.services.map((service) => {
                  const checked = services.includes(service);
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleService(service)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors",
                        checked ? "border-accent/60 bg-accent/5" : "border-border hover:bg-secondary/40"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4.5 shrink-0 items-center justify-center rounded-md border",
                          checked ? "border-accent bg-accent text-accent-foreground" : "border-border"
                        )}
                      >
                        {checked && <Check className="size-3" />}
                      </span>
                      {service}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={back}>Back</Button>
                <Button className="flex-1" disabled={services.length === 0} onClick={next}>Continue</Button>
              </div>
            </>
          )}

          {step === "branding" && (
            <>
              <h1 className="mt-3 font-heading text-2xl font-semibold">Add your accent colour</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Shows up on your client portal. A logo upload is coming soon — this is enough to get started.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="size-12 cursor-pointer rounded-lg border border-border"
                  aria-label="Accent colour"
                />
                <span className="font-mono text-sm text-muted-foreground">{accentColor}</span>
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={back}>Back</Button>
                <Button className="flex-1" onClick={next}>Continue</Button>
              </div>
            </>
          )}

          {step === "review" && (
            <>
              <h1 className="mt-3 font-heading text-2xl font-semibold">Ready to create your workspace</h1>
              <div className="mt-6 space-y-3 rounded-xl border border-border bg-secondary/30 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Starting with</span>
                  <span className="font-medium">
                    {startMode === "trial" ? "7-day free trial" : `${platformPlans.find((p) => p.slug === selectedPlan)?.name} plan`}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Agency</span><span className="font-medium">{agencyName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">{selectedType?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Services</span><span className="text-right font-medium">{services.join(", ")}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Accent</span><span className="inline-flex size-4 rounded-full border border-border" style={{ backgroundColor: accentColor }} /></div>
              </div>
              {status === "error" && errorMessage && (
                <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
              )}
              <div className="mt-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={back} disabled={status === "submitting"}>Back</Button>
                <Button className="flex-1" onClick={handleCreate} disabled={status === "submitting"}>
                  {status === "submitting" ? "Creating…" : startMode === "pay-now" ? "Continue to payment" : "Create my agency"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
