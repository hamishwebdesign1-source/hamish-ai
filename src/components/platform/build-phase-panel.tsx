"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Check, RotateCcw, CheckCircle2, Circle, FileText, ChevronDown, ChevronUp, Loader2, Wrench, BookOpen, ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { startBuildPhaseGeneration, generateNextBuildPhase, toggleChecklistItem, advanceBuildPhase } from "@/app/studio/(authed)/website-builder/actions";
import { AI_CODING_TOOLS, type ToolId } from "@/lib/ai-coding-tools";
import { BUILD_PHASE_ORDER, BUILD_PHASE_LABELS, type BuildPhase, type ChecklistItem } from "@/lib/website-build-phases";
import { BuildPhasePromptLinks } from "@/components/platform/build-phase-prompt-links";

function CopyInstructionsButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy instructions"}
    </Button>
  );
}

// Website Builder build-phase flow (BACKLOG.md, 2026-09-11) — read-only
// rendering of a phase's checklist, shared by the Done and Read-ahead
// tiers below. No <button> wrapper anywhere in here, by construction:
// checklist *state* only ever changes on the current phase's own
// interactive checklist further down this file, never here — the
// read-ahead/done cards are display-only, not just conventionally but
// structurally, so there's no code path that could let someone tick a
// future phase's boxes and skip ahead.
function StaticChecklist({ checklist, variant }: { checklist: ChecklistItem[]; variant: "done" | "read-ahead" }) {
  return (
    <ul className="mt-1.5 space-y-0.5">
      {checklist.map((item, itemIndex) => (
        <li key={itemIndex} className="flex items-start gap-2 px-1.5 py-1.5 text-sm">
          {variant === "done" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
          ) : (
            <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
          <span className={variant === "done" ? "text-muted-foreground line-through" : ""}>{item.item}</span>
        </li>
      ))}
    </ul>
  );
}

// Tier 2 (of 3) — a phase already advanced past (index < currentPhaseIndex).
// Real bug fix, not just the originally-reported one (DECISIONS.md,
// 2026-09-11): this branch used to render only a checkmark and a label,
// with no way back to a completed phase's own instructions/checklist.
// Collapsible, collapsed by default — same established local-useState +
// aria-expanded pattern as ProspectCard/ClientCard, not Base UI
// Accordion (this is a plain card list, not an accordion widget).
function DonePhaseCard({ index, phase, instructions, projectId }: { index: number; phase: BuildPhase; instructions: string; projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardContent className="space-y-3">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
          <span className="flex min-w-0 items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-accent" />
            <span className="truncate text-sm font-medium">
              Phase {index + 1} — {phase.name}
            </span>
            <Badge variant="success">Done</Badge>
          </span>
          {open ? <ChevronUp className="size-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-4 shrink-0 text-muted-foreground" />}
        </button>

        {open && (
          <div className="space-y-3 border-t border-border pt-3">
            <pre className="max-h-64 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-3 text-xs whitespace-pre-wrap text-foreground">
              {instructions}
            </pre>
            <CopyInstructionsButton text={instructions} />
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Completion checklist</p>
              <StaticChecklist checklist={phase.checklist} variant="done" />
            </div>
            <BuildPhasePromptLinks projectId={projectId} phaseId={phase.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Tier 3 (of 3) — a phase already generated but not yet reached
// (index > currentPhaseIndex, phases[index] already exists). This is
// the actual bug this backlog entry was filed for: content already sits
// in build_phases, but the old UI showed a locked, contentless
// placeholder regardless. `FileText`, not `Lock` — it's not access-
// gated, just not started, and the badge label makes that distinction
// explicit so it can't be mistaken for "Done".
function ReadAheadPhaseCard({ index, phase, instructions, projectId }: { index: number; phase: BuildPhase; instructions: string; projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardContent className="space-y-3">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
          <span className="flex min-w-0 items-center gap-2">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-medium">
              Phase {index + 1} — {phase.name}
            </span>
            <Badge variant="secondary">Written — not started</Badge>
          </span>
          {open ? <ChevronUp className="size-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-4 shrink-0 text-muted-foreground" />}
        </button>

        {open && (
          <div className="space-y-3 border-t border-border pt-3">
            <pre className="max-h-64 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-3 text-xs whitespace-pre-wrap text-foreground">
              {instructions}
            </pre>
            <CopyInstructionsButton text={instructions} />
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Completion checklist</p>
              <StaticChecklist checklist={phase.checklist} variant="read-ahead" />
              <p className="mt-1.5 text-xs text-muted-foreground">You&apos;ll be able to check these off once you reach this phase.</p>
            </div>
            <BuildPhasePromptLinks projectId={projectId} phaseId={phase.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// AI Website Creation Guide, WB2 (rewritten WB9) — §10-11: every phase
// gets a Copy Instructions button and a Completion Checklist, and the
// agency can only continue once the current phase's checklist is
// genuinely checked off (re-verified server-side in advanceBuildPhase(),
// not just gated in this component's own state). Phase 1's instructions
// are prefixed with the confirmed tool's real setup mechanics
// (ai-coding-tools.ts) — the one part of the process that's genuinely
// tool-specific rather than "agentic coding assistant in general."
//
// WB9: generation is incremental and progressively rendered. Phase 1
// becomes a real, usable card the moment it lands (~20-40s), not after
// all 10 finish (several minutes) — the single biggest friction point
// found live-testing this. Local `phases` state is the accumulator
// during an active generation run (explicit setState per phase, not
// relying on revalidatePath's automatic re-render to land mid-transition
// — the same reliable pattern the old sequential design already used).
// The full BUILD_PHASE_ORDER/BUILD_PHASE_LABELS list is always the
// structural spine for what renders — phases not yet generated still
// show a real, named placeholder card.
//
// Website Builder build-phase flow (BACKLOG.md, 2026-09-11) — content
// *visibility* is now decoupled from checklist-gated *advancement*.
// Three real tiers per phase, replacing the old two (locked / current):
// Current (index === currentPhaseIndex, the only card with an
// interactive checklist and the Continue button), Done (index <
// currentPhaseIndex, collapsible, static checklist — DonePhaseCard),
// and Read-ahead (index > currentPhaseIndex but already generated,
// collapsible, static checklist — ReadAheadPhaseCard). A phase that
// genuinely doesn't exist yet (mid-run or a stalled run) still shows a
// real, named placeholder — spinner if it's the one currently being
// written, otherwise a plain "not yet written" row with no Lock icon or
// opacity-60 framing, since nothing here is actually access-gated.
// "Continue to next phase" stays strictly sequential and re-verified
// server-side exactly as before — this only changes what's visible, not
// what advances current_phase_index.
export function BuildPhasePanel({
  projectId,
  recommendedTool,
  buildPhases,
  currentPhaseIndex,
}: {
  projectId: string;
  recommendedTool: ToolId | null;
  buildPhases: BuildPhase[] | null;
  currentPhaseIndex: number;
}) {
  const router = useRouter();
  const [phases, setPhases] = useState<BuildPhase[]>(buildPhases ?? []);
  const [generating, startGenerateTransition] = useTransition();
  const [checklistPending, startChecklistTransition] = useTransition();
  const [advancing, startAdvanceTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasStarted = buildPhases !== null;
  const isComplete = phases.length === BUILD_PHASE_ORDER.length;

  // fromIndex === 0 is a genuine fresh start (first generation, or an
  // explicit "Regenerate all") — only that case resets the project
  // server-side (startBuildPhaseGeneration). Any other fromIndex is a
  // resume (a real failure, or just continuing a run left unfinished
  // from an earlier session) and picks up exactly where the project's
  // own build_phases array already is.
  function generate(fromIndex = 0) {
    setError(null);
    if (fromIndex === 0) setPhases([]);
    startGenerateTransition(async () => {
      if (fromIndex === 0) {
        const startResult = await startBuildPhaseGeneration(projectId);
        if ("error" in startResult) {
          setError(startResult.error);
          return;
        }
        // Resets current_phase_index and stage server-side (a fresh
        // start or explicit regenerate) — refresh so sibling components
        // reading those as their own props (ProjectStageTracker) see it
        // too, same reasoning as advance()'s own refresh below.
        router.refresh();
      }

      for (let i = fromIndex; i < BUILD_PHASE_ORDER.length; i++) {
        const r = await generateNextBuildPhase(projectId);
        if ("error" in r) {
          setError(r.error);
          return;
        }
        setPhases((prev) => [...prev, r.phase]);
      }
      router.refresh();
    });
  }

  // Flips one checklist item in local state — used both as the
  // optimistic update on click and, applied a second time, as the
  // rollback on failure (flipping the same boolean twice is the
  // identity operation, so one function does both).
  //
  // Real bug this fixes: `phases` is local state seeded once from the
  // buildPhases prop, so a prop refresh after toggleChecklistItem's own
  // revalidatePath never reaches it — React's useState only reads its
  // initial-value argument on first mount, not on every re-render. The
  // server-side toggle was succeeding correctly every time (confirmed
  // directly against the database); the checkbox just never visually
  // updated because nothing here was ever telling this component about
  // it. Found live-testing WB9 by comparing what the UI showed against
  // what had actually been saved.
  function flipLocalChecklistItem(phaseId: string, itemIndex: number) {
    setPhases((prev) => prev.map((p) => (p.id === phaseId ? { ...p, checklist: p.checklist.map((c, i) => (i === itemIndex ? { ...c, done: !c.done } : c)) } : p)));
  }

  function toggle(phaseId: string, itemIndex: number) {
    setError(null);
    flipLocalChecklistItem(phaseId, itemIndex);
    startChecklistTransition(async () => {
      const r = await toggleChecklistItem(projectId, phaseId, itemIndex);
      if ("error" in r) {
        setError(r.error);
        flipLocalChecklistItem(phaseId, itemIndex); // roll back the optimistic flip
      }
    });
  }

  function advance() {
    setError(null);
    startAdvanceTransition(async () => {
      const r = await advanceBuildPhase(projectId);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      // currentPhaseIndex is read straight from the prop (never
      // shadowed into local state), so an explicit refresh is what
      // actually gets the newly-advanced index down to this
      // already-mounted component — same reason this component can't
      // rely on an assumed automatic prop refresh for `phases` either.
      router.refresh();
    });
  }

  if (!hasStarted && phases.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Wrench className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {recommendedTool ? "Ready to generate your step-by-step build instructions." : "Choose an AI coding tool above first."}
          </p>
          <Button size="sm" className="mt-4" disabled={generating || !recommendedTool} onClick={() => generate()}>
            {generating ? "Writing Phase 1…" : "Generate build instructions"}
          </Button>
          {generating && <p className="mt-2 text-xs text-muted-foreground">Phase 1 is usually ready in well under a minute.</p>}
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  const tool = recommendedTool ? AI_CODING_TOOLS[recommendedTool] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Building with <span className="font-medium text-foreground">{tool?.name ?? "your chosen tool"}</span>
          </p>
          {recommendedTool && (
            <Link
              href={`/studio/website-builder/guides/${recommendedTool}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent"
            >
              <BookOpen className="size-3.5" /> Guide
            </Link>
          )}
        </div>
        {isComplete && (
          <Button size="xs" variant="ghost" disabled={generating} onClick={() => generate()}>
            <RotateCcw className="size-3.5" /> {generating ? "Regenerating…" : "Regenerate all phases"}
          </Button>
        )}
      </div>

      {/* Website Builder build-phase flow (BACKLOG.md, 2026-09-11), point 3
          — the "get everything" answer to "can we just provide them with
          the personalised prompts?". Shown as soon as phase 1 exists, not
          gated on completion — reuses the field-provenance banner chrome
          (border-accent/30 bg-accent/5) established elsewhere in Studio. */}
      {phases.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
          <p className="flex items-start gap-2 text-xs text-accent">
            <ScrollText className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Full build script — {phases.length} of {BUILD_PHASE_ORDER.length} phases written. Read, copy, or print the whole thing in one
              place.
            </span>
          </p>
          <Button size="sm" render={<Link href={`/studio/website-builder/${projectId}/script`} />}>
            Open full script
          </Button>
        </div>
      )}

      {!isComplete && !generating && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border p-3">
          <p className="text-xs text-muted-foreground">
            {phases.length} of {BUILD_PHASE_ORDER.length} phases written.
          </p>
          <Button size="xs" variant="outline" onClick={() => generate(phases.length)}>
            <RotateCcw className="size-3.5" /> {error ? "Retry from where it stopped" : "Continue generating the rest"}
          </Button>
        </div>
      )}
      {generating && (
        <p className="text-xs text-muted-foreground">
          Writing phase {Math.min(phases.length + 1, BUILD_PHASE_ORDER.length)} of {BUILD_PHASE_ORDER.length}…
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      <ul className="space-y-2">
        {BUILD_PHASE_ORDER.map((phaseId, index) => {
          const phase = phases[index];
          const isDone = index < currentPhaseIndex;
          const isReached = index === currentPhaseIndex;
          const isTrueLast = index === BUILD_PHASE_ORDER.length - 1;
          const nextPhaseReady = isTrueLast || phases.length > index + 1;
          // Typed as a plain string (not string | undefined) — every
          // branch below that reads it only does so once `phase` is
          // already known truthy, so the fallback "" is never actually
          // rendered, just keeps this a real string for TypeScript
          // without a non-null assertion at each call site.
          const instructions: string = phase ? (index === 0 && tool ? `${tool.setupPreamble}\n\n${phase.instructions}` : phase.instructions) : "";

          // Not yet generated (mid-run or a stalled run) and genuinely
          // not the phase currently being written — a real, named
          // placeholder, but not "locked": nothing here is actually
          // access-gated, it just doesn't exist yet.
          if (!phase && !isReached) {
            return (
              <li key={phaseId}>
                <Card>
                  <CardContent className="flex items-center gap-2.5 py-3">
                    <Circle className="size-4 shrink-0 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Phase {index + 1} — {BUILD_PHASE_LABELS[phaseId]} — not yet written
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          }

          if (isDone && phase) {
            return <li key={phaseId}><DonePhaseCard index={index} phase={phase} instructions={instructions} projectId={projectId} /></li>;
          }

          // Reached, but not yet generated — this is genuinely current
          // (not locked), the agency just needs a moment before it's
          // ready to read.
          if (!phase) {
            return (
              <li key={phaseId}>
                <Card className="border-accent/40">
                  <CardContent className="flex items-center gap-2.5 py-3">
                    <Loader2 className="size-4 shrink-0 animate-spin text-accent" />
                    <p className="text-sm">
                      Phase {index + 1} — {BUILD_PHASE_LABELS[phaseId]} — still being written
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          }

          if (!isReached) {
            // Read-ahead: already generated, not yet reached.
            return <li key={phaseId}><ReadAheadPhaseCard index={index} phase={phase} instructions={instructions} projectId={projectId} /></li>;
          }

          const allChecked = phase.checklist.every((c) => c.done);

          return (
            <li key={phaseId}>
              <Card className="border-accent/40">
                <CardContent className="space-y-3">
                  <p className="font-heading text-sm font-semibold">
                    Phase {index + 1} — {phase.name}
                  </p>
                  <pre className="max-h-64 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-3 text-xs whitespace-pre-wrap text-foreground">
                    {instructions}
                  </pre>
                  <CopyInstructionsButton text={instructions} />

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Completion checklist</p>
                    {/* Real user report ("still really hard to click the
                        checkboxes"): the button had zero padding, so the
                        clickable area was exactly the icon+text's own
                        bounding box — a thin, tightly-packed strip with no
                        margin for error, especially on a two-line item.
                        Full-width button, real padding, and a rounded
                        hover background (same affordance convention as
                        studio-nav-link.tsx/today-strip-panel.tsx elsewhere
                        in Studio) turns each row into one generous target
                        instead of just its text. items-start (not
                        items-center) + a small top margin on the icon so a
                        wrapped two-line item still aligns its checkmark to
                        the first line, not the vertical center of the
                        whole block. */}
                    <ul className="mt-1.5 space-y-0.5">
                      {phase.checklist.map((item, itemIndex) => (
                        <li key={itemIndex}>
                          <button
                            type="button"
                            disabled={checklistPending}
                            onClick={() => toggle(phase.id, itemIndex)}
                            className="flex w-full items-start gap-2 rounded-md px-1.5 py-1.5 text-left text-sm hover:bg-secondary/60 hover:text-accent"
                          >
                            {item.done ? (
                              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
                            ) : (
                              <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.item}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <BuildPhasePromptLinks projectId={projectId} phaseId={phase.id} />

                  <div>
                    <Button size="sm" disabled={!allChecked || advancing || !nextPhaseReady} onClick={advance}>
                      {advancing ? "Continuing…" : isTrueLast ? "Finish" : "Continue to next phase"}
                    </Button>
                    {allChecked && !nextPhaseReady && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {generating ? "Waiting for the next phase to finish writing…" : "Click “Continue generating the rest” above first."}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
