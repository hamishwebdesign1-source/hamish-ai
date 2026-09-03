"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, LoaderCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateSalesKit } from "@/app/studio/(authed)/prospects/actions";
import { UsageLimitMessage } from "@/components/platform/usage-limit-message";

// Command Centre "recommend -> act" v1 (backlog: "Wire a one-click action
// to Command Centre's AI recommendations") — a second, "use client" leaf
// call site (same precedent as HelpTip) for the exact same
// generateSalesKit() Server Action SalesKitSection (prospecting-panel.tsx)
// already calls on the Prospects page. No new pipeline, no new usage
// type: this only wires the "Your briefing" card's single topOpportunity
// callout to a pipeline that already exists, metered the same way.
//
// hasKitInitially seeds local state so an already-generated kit and a
// just-generated one render identically — the button never reappears for
// something that already exists.
//
// `compact` (backlog: "Wire the same outreach-kit action to Command
// Centre's Top Prospects list") — the single-callout treatment above
// stacked 5x reads as visually heavy in a list of 5 rows in one card, so
// the top_prospects card passes compact=true for a tighter footprint
// (xs button, tighter top margin) with every state/wording/aria-live
// behaviour otherwise identical. Left flagged for UX/UI Director in the
// handoff rather than treated as a settled call.
export function TopOpportunityKitAction({
  prospectId,
  hasKitInitially,
  compact = false,
}: {
  prospectId: string;
  hasKitInitially: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(hasKitInitially);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<"usage_limit" | "rate_limited" | undefined>(undefined);
  const [usage, setUsage] = useState<{ used: number; limit: number } | undefined>(undefined);

  function onGenerate() {
    startTransition(async () => {
      setError(null);
      setReason(undefined);
      setUsage(undefined);
      const result = await generateSalesKit(prospectId);
      if (result && "error" in result) {
        setError(result.error ?? "Sales kit generation failed.");
        setReason(result.reason);
        if (result.reason === "usage_limit" && result.used !== undefined && result.limit !== undefined) {
          setUsage({ used: result.used, limit: result.limit });
        }
        return;
      }
      setDone(true);
      // Local `done` state is what gives the instant feedback; this just
      // gets the Server Component tree's own hasSalesKit prop to match on
      // its next natural re-render (build-phase-panel.tsx precedent).
      router.refresh();
    });
  }

  return (
    // aria-live so the pending -> result transition is announced without
    // moving focus — signup-form.tsx precedent. SalesKitSection/
    // ResearchTrigger don't have this yet; a real follow-up to backport
    // there, not blocking this item.
    <div className={compact ? "mt-1.5" : "mt-2"} aria-live="polite">
      {done ? (
        <Link href="/studio/prospects" className="inline-flex items-center gap-1.5 text-xs text-accent underline underline-offset-2">
          <CheckCircle2 className="size-3.5 text-accent" /> Outreach kit ready — Open in Prospects
        </Link>
      ) : (
        <Button size={compact ? "xs" : "sm"} variant="outline" disabled={pending} onClick={onGenerate}>
          {pending ? (
            <>
              <LoaderCircle className="size-3.5 animate-spin" /> Writing…
            </>
          ) : (
            <>
              <ClipboardList className="size-3.5" /> Generate outreach kit
            </>
          )}
        </Button>
      )}
      {error &&
        (reason === "usage_limit" && usage ? (
          <div className="mt-2">
            <UsageLimitMessage used={usage.used} limit={usage.limit} suffix="try again next month" />
          </div>
        ) : (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        ))}
    </div>
  );
}
