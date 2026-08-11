"use client";

import { useActionState, useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { generateIdeaResearch, type ContentIdeaResearchState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/time-ago";
import type { ContentIdeaResearch, IdeaScoreBreakdown } from "@/lib/research-content-idea";

// Content Factory MVP Phase A — mirrors research-lead-button.tsx's shape
// exactly (cached research, regenerated only on an explicit click, never
// on page load), simplified for content_ideas' flatter research schema
// (no site-check, no concept-page split calls).
export function ContentIdeaResearchButton({
  ideaId,
  initialResearch,
  initialScore,
  initialBreakdown,
  initialGeneratedAt,
  defaultExpanded = false,
}: {
  ideaId: string;
  initialResearch: ContentIdeaResearch | null;
  initialScore: number | null;
  initialBreakdown: IdeaScoreBreakdown | null;
  initialGeneratedAt: string | null;
  defaultExpanded?: boolean;
}) {
  const boundAction = generateIdeaResearch.bind(null, ideaId);
  const [state, formAction, isPending] = useActionState<ContentIdeaResearchState, FormData>(boundAction, {});
  const [expanded, setExpanded] = useState(defaultExpanded);

  const research = state.research ?? initialResearch;
  const score = state.score ?? initialScore;
  const generatedAt = state.generatedAt ?? initialGeneratedAt;
  const hasResearch = Boolean(research);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <form action={formAction}>
          <Button type="submit" variant="ai" size="xs" disabled={isPending} className="gap-1">
            <Sparkles className="size-3" />
            {isPending ? "Researching…" : hasResearch ? "Re-research" : "Research"}
          </Button>
        </form>
        {score != null && (
          <div className="flex items-center gap-0.5" title={`Score: ${score}/5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`size-1.5 rounded-full ${n <= score ? "bg-accent" : "bg-border"}`} />
            ))}
          </div>
        )}
        {hasResearch && generatedAt && <span className="text-xs text-muted-foreground">Researched {timeAgo(generatedAt)}</span>}
        {hasResearch && (
          <Button type="button" variant="ghost" size="xs" onClick={() => setExpanded((v) => !v)} className="gap-1 text-muted-foreground">
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {expanded ? "Hide" : "Show"} findings
          </Button>
        )}
      </div>
      {state.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
      {hasResearch && research && expanded && (
        <div className="mt-2 space-y-2.5 rounded-lg border border-border bg-muted/40 p-3 text-xs">
          <p className="italic">&ldquo;{research.suggested_angle}&rdquo;</p>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">Novelty: {research.novelty}</Badge>
            <Badge variant="secondary">Competition: {research.competition_level}</Badge>
            <Badge variant="secondary">Production: {research.production_difficulty}</Badge>
            <Badge variant="secondary">Evergreen: {research.evergreen_value}</Badge>
          </div>

          <p>
            <span className="font-medium text-foreground">Trend validation: </span>
            {research.trend_validation}
          </p>
          <p>
            <span className="font-medium text-foreground">Audience fit: </span>
            {research.audience_fit}
          </p>
          <p>
            <span className="font-medium text-foreground">Differentiation: </span>
            {research.differentiation}
          </p>

          {research.competitor_examples.length > 0 && (
            <div>
              <p className="font-medium text-foreground">Similar content out there</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {research.competitor_examples.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {research.risk_notes.length > 0 && (
            <div>
              <p className="font-medium text-foreground">Risk notes</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {research.risk_notes.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {initialBreakdown && (
            <details>
              <summary className="cursor-pointer text-muted-foreground select-none">Score breakdown</summary>
              <ul className="mt-1.5 space-y-0.5 pl-4">
                <li>Novelty: {initialBreakdown.novelty_points}/2</li>
                <li>Competition (low is good): {initialBreakdown.competition_points}/2</li>
                <li>Production ease (low difficulty is good): {initialBreakdown.production_points}/2</li>
                <li>Evergreen value: {initialBreakdown.evergreen_points}/2</li>
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
