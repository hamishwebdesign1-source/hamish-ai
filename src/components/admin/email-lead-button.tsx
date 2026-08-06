"use client";

import { useActionState, useState, useTransition } from "react";
import { Mail, ExternalLink, RefreshCw, Check } from "lucide-react";
import { generateLeadEmailDraft, checkLeadEmailSent, markLeadEmailSent, type DraftEmailState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

const GMAIL_DRAFTS_URL = "https://mail.google.com/mail/u/0/#drafts";

// Drafts a personalised outreach (or, once already contacted, a short
// follow-up) email as a real Gmail draft (server-side, via the Gmail API —
// see gmail-draft.ts), signature included. Never auto-sends: the operator
// still opens Gmail and hits send themselves. The lead isn't marked
// "contacted" here — only once that send is actually confirmed, either by
// the daily cron sweep, the "Check now" button, or the "Sent" checkbox
// (for when the automated Gmail check is unavailable/erroring, or the
// operator just wants to confirm it themselves without waiting).
export function EmailLeadButton({
  leadId,
  isFollowUp = false,
  hasPendingDraft = false,
  alreadySent = false,
}: {
  leadId: string;
  isFollowUp?: boolean;
  hasPendingDraft?: boolean;
  alreadySent?: boolean;
}) {
  const boundAction = generateLeadEmailDraft.bind(null, leadId, isFollowUp);
  const [state, formAction, isPending] = useActionState<DraftEmailState, FormData>(boundAction, {});
  const [checkResult, setCheckResult] = useState<"sent" | "pending" | "gone" | "no_pending_draft" | null>(null);
  const [isChecking, startChecking] = useTransition();
  const [isMarkingSent, startMarkingSent] = useTransition();

  const draftJustCreated = Boolean(state.subject && !state.error);
  const showPendingUi = hasPendingDraft || draftJustCreated;
  const sentConfirmed = alreadySent || checkResult === "sent";

  function checkNow() {
    startChecking(async () => {
      const result = await checkLeadEmailSent(leadId);
      setCheckResult(result.status);
    });
  }

  function confirmSentManually() {
    startMarkingSent(async () => {
      await markLeadEmailSent(leadId);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <form action={formAction}>
          <Button type="submit" variant="outline" size="xs" disabled={isPending} className="gap-1">
            <Mail className="size-3" />
            {isPending ? "Drafting…" : isFollowUp ? "Follow up" : "Email"}
          </Button>
        </form>
        {showPendingUi && !sentConfirmed && (
          <>
            <a
              href={GMAIL_DRAFTS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-xs text-accent hover:underline"
            >
              Open Gmail drafts <ExternalLink className="size-3" />
            </a>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={checkNow}
              disabled={isChecking}
              className="gap-1 text-muted-foreground"
            >
              <RefreshCw className={`size-3 ${isChecking ? "animate-spin" : ""}`} />
              {isChecking ? "Checking…" : "Check if sent"}
            </Button>
          </>
        )}
        {/* Manual fallback for when the automated Gmail check is
            unavailable (or the operator already sent it themselves and
            doesn't want to wait) — ticking this sets contacted_at directly,
            which is what starts the 5-day call-reminder cadence. */}
        <label className="flex items-center gap-1 text-xs text-muted-foreground select-none">
          <input
            type="checkbox"
            checked={sentConfirmed}
            disabled={sentConfirmed || isMarkingSent}
            onChange={confirmSentManually}
            className="size-3 accent-current"
          />
          {isMarkingSent ? "Marking…" : "Sent"}
        </label>
      </div>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      {draftJustCreated && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Check className="size-3" />
          Draft created in Gmail — review and send it from there.
        </p>
      )}
      {sentConfirmed && (
        <p className="text-xs text-success">Confirmed sent — marked as contacted.</p>
      )}
      {checkResult === "pending" && (
        <p className="text-xs text-muted-foreground">Still sitting in Drafts — not sent yet.</p>
      )}
      {checkResult === "gone" && (
        <p className="text-xs text-muted-foreground">Draft no longer exists (deleted, not sent).</p>
      )}
      {checkResult === "no_pending_draft" && (
        <p className="text-xs text-muted-foreground">No pending draft to check.</p>
      )}
    </div>
  );
}
