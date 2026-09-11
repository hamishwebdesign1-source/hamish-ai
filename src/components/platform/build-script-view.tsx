"use client";

import { useState } from "react";
import { Copy, Check, CheckCircle2, Circle } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { BUILD_PHASE_ORDER, BUILD_PHASE_LABELS, type BuildPhase } from "@/lib/website-build-phases";
import type { ToolProfile } from "@/lib/ai-coding-tools";
import { BuildPhasePromptLinks } from "@/components/platform/build-phase-prompt-links";

// Website Builder build-phase flow (BACKLOG.md, 2026-09-11), point 3 —
// the same instructions-with-tool-preamble logic build-phase-panel.tsx
// uses for Phase 1, kept in sync here rather than duplicated ad hoc.
function phaseInstructions(phase: BuildPhase, index: number, tool: ToolProfile | null): string {
  return index === 0 && tool ? `${tool.setupPreamble}\n\n${phase.instructions}` : phase.instructions;
}

// The literal answer to "can we just provide them with the personalised
// prompts?" — every generated phase's instructions, concatenated under a
// real heading, ready to paste into a fresh coding-agent session or keep
// as a single reference document. Checklists are a human tracking aid,
// not something that belongs in a prompt to paste into an agent, so
// they're deliberately left out of this concatenation (they're still
// fully visible per-phase in the accordion below).
function buildEntireScript(phases: BuildPhase[], tool: ToolProfile | null): string {
  return phases.map((phase, i) => `## Phase ${i + 1} — ${phase.name}\n\n${phaseInstructions(phase, i, tool)}`).join("\n\n");
}

function CopyButton({ text, label }: { text: string; label: string }) {
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
      {copied ? "Copied" : label}
    </Button>
  );
}

// Website Builder build-phase flow (BACKLOG.md, 2026-09-11), point 3 —
// the dedicated "get everything" view. A real page, not a modal/dialog
// (~8,500 words on a real project doesn't fit a modal viewport) and not
// an expand-all toggle on the existing per-card list (would keep the
// nested max-h-64 overflow-y-auto scroll boxes on the same page as the
// tracked-progress UI, fighting nested scroll regions on mobile — the
// same reasoning Projects Kanban's own mobile Accordion view already
// established). Every *generated* phase is a real AccordionItem, open
// by default (multiple, defaultValue = every generated phase's id) —
// the point of this page is reading everything at once, not a second
// collapse-by-default UI. Ungenerated phases render as a plain muted
// row, not an accordion item. Checklists render read-only here (same
// static-list treatment as the Done/Read-ahead tiers on the project
// page) — checklist *state* only ever changes in one place, the current
// phase's card on the main project page, never here.
export function BuildScriptView({ projectId, tool, phases }: { projectId: string; tool: ToolProfile | null; phases: BuildPhase[] }) {
  const generatedIds = phases.map((p) => p.id);
  const entireScript = buildEntireScript(phases, tool);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
        <p className="text-xs text-accent">
          Everything you&apos;ve generated so far, in one place — this doesn&apos;t affect your tracked progress on the project page.
        </p>
        {phases.length > 0 && <CopyButton text={entireScript} label="Copy entire script" />}
      </div>

      {phases.length === 0 ? (
        <p className="text-sm text-muted-foreground">No phases have been generated yet — head back to the project page to get started.</p>
      ) : (
        <Accordion multiple defaultValue={generatedIds}>
          {BUILD_PHASE_ORDER.map((phaseId, index) => {
            const phase = phases[index];

            if (!phase) {
              return (
                <p key={phaseId} className="border-b border-border py-2.5 text-sm text-muted-foreground last:border-b-0">
                  Phase {index + 1} — {BUILD_PHASE_LABELS[phaseId]} — not written yet
                </p>
              );
            }

            const instructions = phaseInstructions(phase, index, tool);

            return (
              <AccordionItem key={phaseId} value={phaseId}>
                <AccordionTrigger>
                  Phase {index + 1} — {phase.name}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <pre className="rounded-lg border border-border bg-secondary/30 p-3 text-xs whitespace-pre-wrap text-foreground">{instructions}</pre>
                    <CopyButton text={instructions} label="Copy" />

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Completion checklist</p>
                      <ul className="mt-1.5 space-y-0.5">
                        {phase.checklist.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start gap-2 px-1.5 py-1.5 text-sm">
                            {item.done ? (
                              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
                            ) : (
                              <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <BuildPhasePromptLinks projectId={projectId} phaseId={phase.id} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
