import Link from "next/link";
import { CircleAlert } from "lucide-react";

// Studio Design Audit Tier 5 item #17 — discovery-result-message.tsx's
// limitReached case and top-opportunity-kit-action.tsx's
// reason === "usage_limit" case were two independent implementations of
// "you hit your monthly usage limit," with different amounts of help
// shown (one had no link at all, the other a short "View plan" link).
// Pulled into one shared component so that decision — what this state
// looks like, and whether/how it points at Billing — is made once. Both
// call sites still supply their own `suffix` (the specific consequence of
// hitting the cap in that context — nothing new was searched this run vs.
// this one action didn't complete) since that's genuinely different
// per-caller; everything else (icon, copy shape, link target and text) is
// now identical wherever a usage limit is shown.
export function UsageLimitMessage({
  used,
  limit,
  suffix,
  showBillingLink = true,
}: {
  used: number;
  limit: number;
  suffix: string;
  showBillingLink?: boolean;
}) {
  return (
    <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
      <CircleAlert className="size-4 shrink-0" />
      Monthly limit reached ({used} of {limit}) — {suffix}
      {showBillingLink && (
        <>
          {" "}
          <Link href="/studio/billing" className="underline underline-offset-2">
            Top up credits or upgrade your plan
          </Link>
          .
        </>
      )}
    </p>
  );
}
