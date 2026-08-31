"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markProspectContacted } from "@/app/studio/(authed)/prospects/actions";
import { markRequestResponded } from "@/app/studio/(authed)/requests/actions";
import { updateProjectStatus } from "@/app/studio/(authed)/projects/actions";
import type { ActionQueueItem } from "@/lib/studio-action-queue";

// Command Centre improvement #1 ("cleared queue, not a dashboard") — the
// one-click "clear" control for all three real row kinds in the
// actions_required queue. Takes only the plain, JSON-serialisable `item`
// (id/kind/…) as its prop — this component is mounted from a Server
// Component (buildSectionContent, command-centre-section-cards.tsx), and
// React Server Components can't serialise an arbitrary closure or a bare
// component reference across that boundary ("Functions cannot be passed
// directly to Client Components…", which is exactly what an earlier
// version of this component hit in production by accepting a run()
// closure and an `icon` component as props). Importing each Server Action
// directly and hardcoding each icon here instead is the same discipline
// TopOpportunityKitAction/SendInvoiceReminderAction already follow — this
// is still one shared component, just switching on item.kind (plain data)
// rather than being handed the behaviour as props.
export function QueueItemAction({ item }: { item: ActionQueueItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wording matches each action's existing button elsewhere in Studio —
  // prospecting-panel.tsx's "Mark as contacted", requests-panel.tsx's
  // "Mark as responded", projects-panel.tsx's "Mark done" — the same
  // action reachable from a second place shouldn't read differently there.
  const config =
    item.kind === "follow_up"
      ? { run: () => markProspectContacted(item.id), icon: Send, label: "Mark as contacted", doneLabel: "Marked as contacted" }
      : item.kind === "unanswered_request"
        ? { run: () => markRequestResponded(item.id), icon: CheckCircle2, label: "Mark as responded", doneLabel: "Marked as responded" }
        : { run: () => updateProjectStatus(item.id, "done"), icon: CheckCircle2, label: "Mark done", doneLabel: "Marked done" };
  const Icon = config.icon;

  function onClick() {
    startTransition(async () => {
      setError(null);
      const result = await config.run();
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
          <CheckCircle2 className="size-3.5 text-accent" /> {config.doneLabel}
        </p>
      ) : (
        <Button size="xs" variant="outline" disabled={pending} onClick={onClick}>
          {pending ? (
            <>
              <LoaderCircle className="size-3.5 animate-spin" /> Marking…
            </>
          ) : (
            <>
              <Icon className="size-3.5" /> {config.label}
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
