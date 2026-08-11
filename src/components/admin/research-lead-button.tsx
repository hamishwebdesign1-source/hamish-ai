"use client";

import { useActionState, useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { generateLeadResearch, type ResearchState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/time-ago";
import type { LeadResearch } from "@/lib/research-lead";

// Cached research (site-check + one Claude call — see research-lead.ts),
// rendered here and regenerated only on an explicit click, never on page
// load. `initialResearch`/`initialGeneratedAt` come from the DB so
// already-researched leads show their findings immediately without
// re-running anything.
export function ResearchLeadButton({
  leadId,
  initialResearch,
  initialGeneratedAt,
  defaultExpanded = false,
}: {
  leadId: string;
  initialResearch: LeadResearch | null;
  initialGeneratedAt: string | null;
  // The lead detail page (portal redesign Stage 4) wants AI Intelligence
  // visible without an extra click, since it's a top-level section there
  // rather than one of several buttons on a dense list row — the list
  // page doesn't pass this, so its collapsed-by-default behaviour is
  // unchanged.
  defaultExpanded?: boolean;
}) {
  const boundAction = generateLeadResearch.bind(null, leadId);
  const [state, formAction, isPending] = useActionState<ResearchState, FormData>(boundAction, {});
  const [expanded, setExpanded] = useState(defaultExpanded);

  const research = state.research ?? initialResearch;
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
        {hasResearch && generatedAt && (
          <span className="text-xs text-muted-foreground">Researched {timeAgo(generatedAt)}</span>
        )}
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
          <p className="italic">&ldquo;{research.pursue_because}&rdquo;</p>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">Est. value: {research.estimated_project_value_band}</Badge>
            <Badge variant="secondary">Conversion: {research.conversion_probability_band}</Badge>
            <Badge variant="secondary">AI fit: {research.ai_opportunity_fit}</Badge>
          </div>

          <p>{research.business_summary}</p>

          {research.weaknesses.length > 0 && (
            <div>
              <p className="font-medium text-foreground">Weaknesses</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {research.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
          {research.ai_opportunities.length > 0 && (
            <div>
              <p className="font-medium text-foreground">AI opportunities</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {research.ai_opportunities.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          )}
          {research.recommended_services.length > 0 && (
            <p>
              <span className="font-medium text-foreground">Recommended: </span>
              {research.recommended_services.join(", ")}
            </p>
          )}
          <p>
            <span className="font-medium text-foreground">Sales angle: </span>
            {research.suggested_sales_angle}
          </p>

          {research.concept_page_analysis && research.concept_page_analysis.show_them_this.length > 0 && (
            <div className="rounded-lg border border-[color-mix(in_oklch,var(--gradient-violet),transparent_75%)] bg-[color-mix(in_oklch,var(--gradient-violet),transparent_92%)] p-2.5">
              <p className="font-medium text-foreground">Show them this</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                {research.concept_page_analysis.show_them_this.map((s, i) => (
                  // The model sometimes writes its own "1. "/"2. " prefix
                  // into the string despite the prompt asking it not to —
                  // stripped defensively so it never doubles up with the
                  // <ol>'s own numbering ("1. 1. Live demo…").
                  <li key={i}>{s.replace(/^\d+[.)]\s*/, "")}</li>
                ))}
              </ol>
            </div>
          )}

          {research.sales_strategy && (
            <div className="space-y-2">
              {research.sales_strategy.why_this_lead_matters && (
                <p>
                  <span className="font-medium text-foreground">Why this lead matters: </span>
                  {research.sales_strategy.why_this_lead_matters}
                </p>
              )}
              {research.sales_strategy.discovery_questions.length > 0 && (
                <div>
                  <p className="font-medium text-foreground">Discovery questions</p>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {research.sales_strategy.discovery_questions.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
              )}
              {research.sales_strategy.likely_objections.length > 0 && (
                <div>
                  <p className="font-medium text-foreground">Likely objections</p>
                  <ul className="list-disc space-y-1 pl-4">
                    {research.sales_strategy.likely_objections.map((o, i) => <li key={i}>{o}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <details>
            <summary className="cursor-pointer text-muted-foreground select-none">More findings</summary>
            <div className="mt-1.5 space-y-2">
              {research.strengths.length > 0 && (
                <div>
                  <p className="font-medium text-foreground">Strengths</p>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {research.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {research.seo_observations.length > 0 && (
                <div>
                  <p className="font-medium text-foreground">SEO</p>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {research.seo_observations.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {research.missing_trust_signals.length > 0 && (
                <div>
                  <p className="font-medium text-foreground">Missing trust signals</p>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {research.missing_trust_signals.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {research.missing_conversion_opportunities.length > 0 && (
                <div>
                  <p className="font-medium text-foreground">Missing conversion opportunities</p>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {research.missing_conversion_opportunities.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {research.concept_page_analysis && (
                <>
                  {research.concept_page_analysis.problems_solved.length > 0 && (
                    <div>
                      <p className="font-medium text-foreground">Concept page — problems it solves</p>
                      <ul className="list-disc space-y-0.5 pl-4">
                        {research.concept_page_analysis.problems_solved.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {research.concept_page_analysis.features_to_avoid_mentioning.length > 0 && (
                    <div>
                      <p className="font-medium text-foreground">Concept page — don&apos;t mention yet</p>
                      <ul className="list-disc space-y-0.5 pl-4">
                        {research.concept_page_analysis.features_to_avoid_mentioning.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {research.concept_page_analysis.suggested_additions.length > 0 && (
                    <div>
                      <p className="font-medium text-foreground">Concept page — worth adding before pitching</p>
                      <ul className="list-disc space-y-0.5 pl-4">
                        {research.concept_page_analysis.suggested_additions.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}
              {research.sales_strategy && (
                <>
                  {research.sales_strategy.key_pain_points.length > 0 && (
                    <div>
                      <p className="font-medium text-foreground">Key pain points</p>
                      <ul className="list-disc space-y-0.5 pl-4">
                        {research.sales_strategy.key_pain_points.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {research.sales_strategy.recommended_offer && (
                    <p>
                      <span className="font-medium text-foreground">Recommended offer: </span>
                      {research.sales_strategy.recommended_offer}
                    </p>
                  )}
                </>
              )}
              <p className="text-muted-foreground">
                {research.site_check ? (
                  <>
                    Site check: {research.site_check.resolves ? "resolves" : "does not resolve"}
                    {research.site_check.ssl_ok === false && ", SSL invalid"}
                    {!research.site_check.has_booking_form && ", no booking/contact form detected"}
                    {!research.site_check.mobile_friendly && ", no mobile viewport tag detected"}
                    {research.site_check.redirect_to && `, redirects to ${research.site_check.redirect_to}`}
                  </>
                ) : (
                  "No website on file — researched from business name, category, and notes only."
                )}
              </p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
