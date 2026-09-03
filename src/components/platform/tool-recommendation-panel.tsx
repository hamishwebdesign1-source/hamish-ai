"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { chooseWebsiteTool, confirmWebsiteTool } from "@/app/studio/(authed)/website-builder/actions";
import { AI_CODING_TOOLS, type ToolId, type ToolQuizAnswers } from "@/lib/ai-coding-tools";

const radioClasses = "flex items-center gap-2 text-sm";

// AI Website Creation Guide, WB2 — §9's "Which AI Tool Should I Use?"
// quiz. Deliberately a recommendation, not a lock-in: the agency can
// pick any of the three regardless of what the quiz says, via the tool
// cards shown once a recommendation exists.
export function ToolRecommendationPanel({
  projectId,
  initialAnswers,
  initialRecommendedTool,
}: {
  projectId: string;
  initialAnswers: ToolQuizAnswers | null;
  initialRecommendedTool: ToolId | null;
}) {
  const [answers, setAnswers] = useState<ToolQuizAnswers>(
    initialAnswers ?? { technicalLevel: "beginner", hasCodingEnvironment: false, wantsMaxAutomation: true, wantsVisualEditing: false }
  );
  const [recommendation, setRecommendation] = useState<{ toolId: ToolId; reason: string } | null>(
    initialRecommendedTool ? { toolId: initialRecommendedTool, reason: "" } : null
  );
  const [chosenTool, setChosenTool] = useState<ToolId | null>(initialRecommendedTool);
  const [pending, startTransition] = useTransition();
  const [confirming, startConfirmTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function runQuiz() {
    setError(null);
    startTransition(async () => {
      const r = await chooseWebsiteTool(projectId, answers);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setRecommendation({ toolId: r.toolId, reason: r.reason });
      setChosenTool(r.toolId);
    });
  }

  function confirmTool(toolId: ToolId) {
    setError(null);
    setConfirmed(false);
    setChosenTool(toolId);
    startConfirmTransition(async () => {
      const r = await confirmWebsiteTool(projectId, toolId);
      if ("error" in r) setError(r.error);
      else setConfirmed(true);
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <p className="font-heading text-sm font-semibold">Which AI Tool Should I Use?</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">How technical are you?</p>
              <div className="mt-1.5 space-y-1">
                {(["beginner", "intermediate", "advanced"] as const).map((level) => (
                  <label key={level} className={radioClasses}>
                    <input type="radio" name="level" checked={answers.technicalLevel === level} onChange={() => setAnswers((a) => ({ ...a, technicalLevel: level }))} />
                    <span className="capitalize">{level}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Do you already have a coding environment?</p>
              <div className="mt-1.5 space-y-1">
                <label className={radioClasses}>
                  <input type="radio" name="env" checked={answers.hasCodingEnvironment} onChange={() => setAnswers((a) => ({ ...a, hasCodingEnvironment: true }))} />
                  Yes
                </label>
                <label className={radioClasses}>
                  <input type="radio" name="env" checked={!answers.hasCodingEnvironment} onChange={() => setAnswers((a) => ({ ...a, hasCodingEnvironment: false }))} />
                  No
                </label>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Do you want maximum automation?</p>
              <div className="mt-1.5 space-y-1">
                <label className={radioClasses}>
                  <input type="radio" name="auto" checked={answers.wantsMaxAutomation} onChange={() => setAnswers((a) => ({ ...a, wantsMaxAutomation: true }))} />
                  Yes
                </label>
                <label className={radioClasses}>
                  <input type="radio" name="auto" checked={!answers.wantsMaxAutomation} onChange={() => setAnswers((a) => ({ ...a, wantsMaxAutomation: false }))} />
                  No
                </label>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Do you want visual editing?</p>
              <div className="mt-1.5 space-y-1">
                <label className={radioClasses}>
                  <input type="radio" name="visual" checked={answers.wantsVisualEditing} onChange={() => setAnswers((a) => ({ ...a, wantsVisualEditing: true }))} />
                  Yes
                </label>
                <label className={radioClasses}>
                  <input type="radio" name="visual" checked={!answers.wantsVisualEditing} onChange={() => setAnswers((a) => ({ ...a, wantsVisualEditing: false }))} />
                  No
                </label>
              </div>
            </div>
          </div>
          <Button size="sm" disabled={pending} onClick={runQuiz}>
            {pending ? "Thinking…" : "Get a recommendation"}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {recommendation && (
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.values(AI_CODING_TOOLS) as (typeof AI_CODING_TOOLS)[ToolId][]).map((tool) => {
            const isRecommended = tool.id === recommendation.toolId;
            const isChosen = tool.id === chosenTool;
            return (
              <Card key={tool.id} className={isChosen ? "border-accent" : undefined}>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-heading text-sm font-semibold">{tool.name}</p>
                    {isRecommended && (
                      // Deliberately no Sparkles icon here — chooseWebsiteTool()
                      // (website-builder/actions.ts) is a deterministic decision
                      // tree, not an AI call, and Sparkles is this codebase's
                      // reserved signal for real Anthropic-backed features
                      // elsewhere in Studio. CheckCircle2 (already Studio's
                      // "connected/matched" icon — see settings-panel.tsx,
                      // launch-panel.tsx) reads as "matched," not "AI-generated."
                      <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-accent uppercase">
                        <CheckCircle2 className="size-3" /> Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{tool.description}</p>
                  {isRecommended && recommendation.reason && <p className="text-xs text-accent">{recommendation.reason}</p>}
                  <div className="flex items-center gap-2">
                    <Button size="xs" variant={isChosen ? "secondary" : "outline"} disabled={confirming} onClick={() => confirmTool(tool.id)}>
                      {isChosen ? (
                        <>
                          <CheckCircle2 className="size-3.5" /> Using this
                        </>
                      ) : (
                        `Use ${tool.name}`
                      )}
                    </Button>
                    <Link
                      href={`/studio/website-builder/guides/${tool.id}`}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent"
                    >
                      <BookOpen className="size-3.5" /> Guide
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {confirmed && <p className="text-xs text-accent">Saved — ready to generate your build instructions below.</p>}
    </div>
  );
}
