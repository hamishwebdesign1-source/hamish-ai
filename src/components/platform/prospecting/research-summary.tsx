"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, RefreshCw, ThumbsUp, ThumbsDown, Lightbulb, Gauge, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { researchProspect } from "@/app/studio/(authed)/prospects/actions";
import type { LeadResearch, ScoreBreakdown } from "@/lib/research-lead";

export function ResearchTrigger({ prospectId }: { prospectId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-dashed border-border p-4 text-center">
      <p className="text-sm text-muted-foreground">Not researched yet — no contact details or opportunity analysis found.</p>
      <Button
        size="sm"
        variant="outline"
        className="mt-3"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await researchProspect(prospectId);
            if (r && "error" in r) setError(r.error ?? "Research failed.");
          })
        }
      >
        {pending ? (
          <>
            <LoaderCircle className="size-3.5 animate-spin" /> Researching…
          </>
        ) : (
          <>
            <RefreshCw className="size-3.5" /> Research this business
          </>
        )}
      </Button>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

const FIT_STYLES: Record<LeadResearch["ai_opportunity_fit"], string> = {
  high: "text-accent",
  medium: "text-muted-foreground",
  low: "text-muted-foreground",
};

const SCORE_DIMENSIONS: { key: keyof Omit<ScoreBreakdown, "overall">; label: string }[] = [
  { key: "fit", label: "Fit" },
  { key: "need", label: "Need" },
  { key: "value", label: "Value" },
  { key: "confidence", label: "Confidence" },
];

// Four dimensions rather than one number, so a user can see *why* two
// prospects with the same overall score are actually different — e.g. a
// no-website business scores high on need but lower on confidence, which
// a single 0-5 score would flatten into an identical-looking result.
function ScoreBreakdownBars({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
      {SCORE_DIMENSIONS.map(({ key, label }) => (
        <div key={key}>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{label}</span>
            <span className="font-mono">{breakdown[key]}/5</span>
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(breakdown[key] / 5) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ResearchSummary({ research, scoreBreakdown }: { research: LeadResearch; scoreBreakdown: ScoreBreakdown | null }) {
  return (
    <div className="space-y-4">
      {scoreBreakdown && <ScoreBreakdownBars breakdown={scoreBreakdown} />}

      <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
          <Lightbulb className="size-3.5 shrink-0" />
          Why pursue this one
        </p>
        <p className="mt-1 text-sm">{research.pursue_because}</p>
      </div>

      <p className="text-sm text-muted-foreground">{research.business_summary}</p>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary">{research.estimated_project_value_band}</Badge>
        <Badge variant="secondary" className="capitalize">
          {research.conversion_probability_band} conversion probability
        </Badge>
        <span className={`inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 capitalize ${FIT_STYLES[research.ai_opportunity_fit]}`}>
          <Gauge className="size-3" />
          {research.ai_opportunity_fit} AI fit
        </span>
      </div>

      {research.weaknesses.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ThumbsDown className="size-3.5 shrink-0" /> Weaknesses found
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
            {research.weaknesses.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {research.strengths.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ThumbsUp className="size-3.5 shrink-0" /> Strengths
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
            {research.strengths.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {research.ai_opportunities.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Sparkles className="size-3.5 shrink-0" /> AI opportunities
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
            {research.ai_opportunities.map((o) => (
              <li key={o}>• {o}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg bg-secondary/40 p-3">
        <p className="text-xs font-semibold text-muted-foreground">Suggested opening line</p>
        <p className="mt-1 text-sm italic">&ldquo;{research.suggested_sales_angle}&rdquo;</p>
      </div>
    </div>
  );
}
