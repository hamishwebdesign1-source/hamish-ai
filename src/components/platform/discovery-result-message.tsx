"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";
import type { runDiscovery } from "@/app/studio/(authed)/prospects/actions";
import { UsageLimitMessage } from "@/components/platform/usage-limit-message";

export type DiscoveryResult = Awaited<ReturnType<typeof runDiscovery>>;

// Shared by "Find prospects now" (the saved-niche rotation) and "Search
// now" (searchProspects — an immediate, one-off search) on
// prospecting-panel.tsx, and now by studio-command-palette.tsx's "Run
// prospect discovery now" action — all three call a
// DiscoverLeadsResult-shaped Server Action and need to show the exact
// same set of outcomes (a plain error, the trial/limit/niche guards, or a
// real inserted count), so there's one rendering of each state, not
// three that could quietly drift apart. Pulled into its own file (Studio
// improvement) rather than exported from prospecting-panel.tsx itself —
// that file is large and only ever meant for the Prospects page; the
// command palette mounts once in the (authed) layout on every Studio
// page, so importing this one small component instead of the whole
// panel module keeps its bundle from pulling in code it never renders.
export function DiscoveryResultMessage({ result }: { result: DiscoveryResult }) {
  if ("error" in result) return <p className="text-sm text-destructive">{result.error}</p>;
  if ("nicheRequired" in result && result.nicheRequired) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-destructive">
        <CircleAlert className="size-4 shrink-0" />
        Enter at least one category and one area above before finding prospects.
      </p>
    );
  }
  if ("billingRequired" in result && result.billingRequired) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-destructive">
        <CircleAlert className="size-4 shrink-0" />
        Your trial has ended.{" "}
        <Link href="/studio/billing" className="underline underline-offset-2">
          Subscribe to keep finding prospects
        </Link>
        .
      </p>
    );
  }
  if ("limitReached" in result && result.limitReached) {
    return (
      <UsageLimitMessage
        used={result.limitReached.used}
        limit={result.limitReached.limit}
        suffix="nothing new searched this run"
      />
    );
  }
  if ("inserted" in result) {
    return (
      <>
        <p className="text-sm text-accent">
          Found {result.inserted.length} new prospect{result.inserted.length === 1 ? "" : "s"}
          {result.skippedDuplicates.length > 0 ? ` (${result.skippedDuplicates.length} already known, skipped)` : ""}.
        </p>
        {/* Distinct from "found 0" — a search that actually failed (an
            API error, or the model exhausting its search budget without
            ever submitting a result) shouldn't look identical to one
            that genuinely found nothing. */}
        {result.searchFailures.length > 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-destructive">
            <CircleAlert className="size-4 shrink-0" />
            {result.searchFailures.length} search{result.searchFailures.length === 1 ? "" : "es"} failed (
            {result.searchFailures.join(", ")}) — try again.
          </p>
        )}
      </>
    );
  }
  return null;
}
