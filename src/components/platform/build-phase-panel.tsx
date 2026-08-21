"use client";

import { useState, useTransition } from "react";
import { Copy, Check, RotateCcw, CheckCircle2, Circle, Lock, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  canGenerateWebsitePhases,
  generateWebsitePhaseGroup,
  saveWebsiteBuildPhases,
  toggleChecklistItem,
  advanceBuildPhase,
} from "@/app/studio/(authed)/website-builder/actions";
import { AI_CODING_TOOLS, type ToolId } from "@/lib/ai-coding-tools";
import { PHASE_GROUPS, type BuildPhase } from "@/lib/website-build-phases";

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

// AI Website Creation Guide, WB2 — §10-11: every phase gets a Copy
// Instructions button and a Completion Checklist, and the agency can
// only continue once the current phase's checklist is genuinely
// checked off (re-verified server-side in advanceBuildPhase(), not just
// gated in this component's own state). Phase 1's instructions are
// prefixed with the confirmed tool's real setup mechanics
// (ai-coding-tools.ts) — the one part of the process that's genuinely
// tool-specific rather than "agentic coding assistant in general."
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
  const [generating, startGenerateTransition] = useTransition();
  const [phasesDone, setPhasesDone] = useState<BuildPhase[]>([]);
  const [failedAt, setFailedAt] = useState<number | null>(null);
  const [checklistPending, startChecklistTransition] = useTransition();
  const [advancing, startAdvanceTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Generates one phase per Server Action call, sequentially — not the
  // "fire all in parallel" design this started with. Real-world testing
  // found that design didn't actually run concurrently on this app's
  // Vercel plan (the request log showed calls landing 25-90s apart
  // regardless), and the old code's Promise.all had no real per-call
  // failure handling — one bad response silently saved placeholder text
  // for several phases with no error shown. Sequential is honest about
  // what actually happens, and resumable: a failure stops the loop and
  // keeps everything generated so far, so retrying only re-attempts the
  // phase that actually failed rather than starting over and re-paying
  // for phases that already worked.
  function generate(fromIndex = 0) {
    setError(null);
    setFailedAt(null);
    if (fromIndex === 0) setPhasesDone([]);
    startGenerateTransition(async () => {
      if (fromIndex === 0) {
        const gate = await canGenerateWebsitePhases(projectId);
        if ("error" in gate) {
          setError(gate.error);
          return;
        }
      }

      const collected = fromIndex === 0 ? [] : [...phasesDone];
      for (let i = fromIndex; i < PHASE_GROUPS.length; i++) {
        const r = await generateWebsitePhaseGroup(projectId, i);
        if ("error" in r) {
          setError(r.error);
          setFailedAt(i);
          setPhasesDone(collected);
          return;
        }
        collected.push(...r.phases);
        setPhasesDone([...collected]);
      }

      const saveResult = await saveWebsiteBuildPhases(projectId, collected);
      if ("error" in saveResult) setError(saveResult.error);
    });
  }

  function toggle(phaseId: string, itemIndex: number) {
    setError(null);
    startChecklistTransition(async () => {
      const r = await toggleChecklistItem(projectId, phaseId, itemIndex);
      if ("error" in r) setError(r.error);
    });
  }

  function advance() {
    setError(null);
    startAdvanceTransition(async () => {
      const r = await advanceBuildPhase(projectId);
      if ("error" in r) setError(r.error);
    });
  }

  if (!buildPhases) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Wrench className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {recommendedTool ? "Ready to generate your step-by-step build instructions." : "Choose an AI coding tool above first."}
          </p>
          <Button size="sm" className="mt-4" disabled={generating || !recommendedTool} onClick={() => generate()}>
            {generating ? "Generating…" : "Generate build instructions"}
          </Button>
          {generating && (
            <p className="mt-2 text-xs text-muted-foreground">
              Writing one phase at a time… {phasesDone.length} of {PHASE_GROUPS.length} done. This takes a few minutes.
            </p>
          )}
          {error && (
            <div className="mt-2">
              <p className="text-xs text-destructive">{error}</p>
              {failedAt !== null && (
                <Button size="xs" variant="outline" className="mt-1.5" disabled={generating} onClick={() => generate(failedAt)}>
                  <RotateCcw className="size-3.5" /> Retry from where it stopped
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const tool = recommendedTool ? AI_CODING_TOOLS[recommendedTool] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Building with <span className="font-medium text-foreground">{tool?.name ?? "your chosen tool"}</span>
        </p>
        <Button size="xs" variant="ghost" disabled={generating} onClick={() => generate()}>
          <RotateCcw className="size-3.5" /> {generating ? "Regenerating…" : "Regenerate all phases"}
        </Button>
      </div>
      {generating && (
        <p className="text-xs text-muted-foreground">
          Writing one phase at a time… {phasesDone.length} of {PHASE_GROUPS.length} done. This takes a few minutes.
        </p>
      )}
      {error && (
        <div>
          <p className="text-xs text-destructive">{error}</p>
          {failedAt !== null && (
            <Button size="xs" variant="outline" className="mt-1.5" disabled={generating} onClick={() => generate(failedAt)}>
              <RotateCcw className="size-3.5" /> Retry from where it stopped
            </Button>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {buildPhases.map((phase, index) => {
          const isDone = index < currentPhaseIndex;
          const isLocked = index > currentPhaseIndex;
          const allChecked = phase.checklist.every((c) => c.done);
          const instructions = index === 0 && tool ? `${tool.setupPreamble}\n\n${phase.instructions}` : phase.instructions;

          if (isLocked) {
            return (
              <li key={phase.id}>
                <Card className="opacity-60">
                  <CardContent className="flex items-center gap-2.5 py-3">
                    <Lock className="size-4 shrink-0 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Phase {index + 1} — {phase.name}
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          }

          if (isDone) {
            return (
              <li key={phase.id}>
                <Card>
                  <CardContent className="flex items-center gap-2.5 py-3">
                    <CheckCircle2 className="size-4 shrink-0 text-accent" />
                    <p className="text-sm">
                      Phase {index + 1} — {phase.name}
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          }

          return (
            <li key={phase.id}>
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
                    <ul className="mt-1.5 space-y-1.5">
                      {phase.checklist.map((item, itemIndex) => (
                        <li key={itemIndex}>
                          <button
                            type="button"
                            disabled={checklistPending}
                            onClick={() => toggle(phase.id, itemIndex)}
                            className="flex items-center gap-2 text-left text-sm hover:text-accent"
                          >
                            {item.done ? (
                              <CheckCircle2 className="size-4 shrink-0 text-accent" />
                            ) : (
                              <Circle className="size-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.item}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button size="sm" disabled={!allChecked || advancing} onClick={advance}>
                    {advancing ? "Continuing…" : index === buildPhases.length - 1 ? "Finish" : "Continue to next phase"}
                  </Button>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
