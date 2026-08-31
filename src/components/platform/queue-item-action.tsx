"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, CheckCircle2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Command Centre improvement #1 ("cleared queue, not a dashboard") — the
// one-click "clear" control shared by all three real row kinds in the
// actions_required queue (follow-up due, unanswered request, overdue
// project). Unlike TopOpportunityKitAction (usage-limit state) or
// SendInvoiceReminderAction (internal-org gate), none of these three
// actions has a per-action special case to handle — they're the exact
// same resting/pending/done/error state machine over three different
// Server Actions, so this is genuinely one shared component parameterised
// by the action to run, rather than three near-identical files.
export function QueueItemAction({
  run,
  icon: Icon,
  label,
  pendingLabel,
  doneLabel,
}: {
  run: () => Promise<{ error?: string } | { ok: true }>;
  icon: LucideIcon;
  label: string;
  pendingLabel: string;
  doneLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    startTransition(async () => {
      setError(null);
      const result = await run();
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setDone(true);
      // Same reason as TopOpportunityKitAction's own router.refresh() —
      // local `done` state gives the instant feedback; this just gets the
      // Server Component tree's own data to match on its next natural
      // re-render (the row disappearing from a re-fetched, now-shorter
      // action queue).
      router.refresh();
    });
  }

  return (
    <div className="mt-1" aria-live="polite">
      {done ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-accent">
          <CheckCircle2 className="size-3.5 text-accent" /> {doneLabel}
        </p>
      ) : (
        <Button size="xs" variant="outline" disabled={pending} onClick={onClick}>
          {pending ? (
            <>
              <LoaderCircle className="size-3.5 animate-spin" /> {pendingLabel}
            </>
          ) : (
            <>
              <Icon className="size-3.5" /> {label}
            </>
          )}
        </Button>
      )}
      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
