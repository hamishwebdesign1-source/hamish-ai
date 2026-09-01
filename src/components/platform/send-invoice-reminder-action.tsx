"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, LoaderCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendClientInvoiceReminderAction } from "@/app/studio/(authed)/clients/actions";

// Command Centre Engagement Risk "Send payment reminder" (backlog:
// "One-click 'Send payment reminder' on Command Centre's Engagement Risk
// card…") — same resting/pending/success/error state-machine shape as
// TopOpportunityKitAction, minus the usage-limit state: this isn't an
// AI-metered action, sendInvoiceReminder() is a fixed-template email send,
// so there's no plan cap to hit.
//
// alreadySentInitially seeds local "done" state the same way
// hasKitInitially does there — a reminder already sent for this invoice
// renders as already-done immediately, no re-offer of "Send reminder" for
// something that already happened.
//
// Only ever rendered by the caller when canSendClientEmail is true — see
// page.tsx's own comment: HamishAI's own org always qualifies, a tenant
// org qualifies once it's set a reply-to email in Settings (roadmap item
// #1, send-org-email.ts). Either way sendInvoiceReminder() resolves the
// real sending identity itself; this component doesn't need to know which
// case it is.
export function SendInvoiceReminderAction({ invoiceId, alreadySentInitially }: { invoiceId: string; alreadySentInitially: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(alreadySentInitially);
  const [error, setError] = useState<string | null>(null);

  function onSend() {
    startTransition(async () => {
      setError(null);
      const result = await sendClientInvoiceReminderAction(invoiceId);
      if (result && "error" in result) {
        setError(result.error ?? "Failed to send the reminder.");
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  return (
    <div className="mt-1.5" aria-live="polite">
      {done ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-accent">
          <CheckCircle2 className="size-3.5 text-accent" /> Reminder sent
        </p>
      ) : (
        <Button size="xs" variant="outline" disabled={pending} onClick={onSend}>
          {pending ? (
            <>
              <LoaderCircle className="size-3.5 animate-spin" /> Sending…
            </>
          ) : (
            <>
              <Send className="size-3.5" /> Send reminder
            </>
          )}
        </Button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
