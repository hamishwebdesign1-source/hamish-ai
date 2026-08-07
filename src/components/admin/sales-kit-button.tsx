"use client";

import { useActionState, useState, useTransition } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Mail,
  ExternalLink,
  RefreshCw,
  Check,
  Copy,
  CopyCheck,
  Phone,
  PhoneCall,
  MessageSquareText,
  CalendarDays,
  FileText,
} from "lucide-react";
import {
  generateSalesKit,
  saveSalesKitEmailToGmail,
  checkLeadEmailSent,
  markLeadEmailSent,
  markLeadCalled,
  type SalesKitState,
  type SaveKitEmailState,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/time-ago";
import type { SalesKit } from "@/lib/draft-sales-kit";

const GMAIL_DRAFTS_URL = "https://mail.google.com/mail/u/0/#drafts";

// A copy-to-clipboard button reused for every panel below — each artifact
// has its own "what does copying even mean here" shape, so the caller
// passes the already-flattened text rather than this component knowing
// about SalesKit's structure.
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="gap-1 text-muted-foreground"
    >
      {copied ? <CopyCheck className="size-3 text-success" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

// The email half of the kit needs the same "save a real Gmail draft, then
// confirm it was actually sent" flow EmailLeadButton had — reused here,
// just reading pre-generated text out of the cached kit instead of calling
// the LLM again. `variant` picks which of the two cached emails to save.
function KitEmailSection({
  leadId,
  variant,
  email,
  hasPendingDraft,
  alreadySent,
}: {
  leadId: string;
  variant: "outreach" | "follow_up";
  email: { subject: string; body: string };
  hasPendingDraft: boolean;
  alreadySent: boolean;
}) {
  const boundAction = saveSalesKitEmailToGmail.bind(null, leadId, variant);
  const [state, formAction, isPending] = useActionState<SaveKitEmailState, FormData>(boundAction, {});
  const [checkResult, setCheckResult] = useState<"sent" | "pending" | "gone" | "no_pending_draft" | null>(null);
  const [isChecking, startChecking] = useTransition();
  const [isMarkingSent, startMarkingSent] = useTransition();

  const justSaved = Boolean(state.email !== undefined && !state.error);
  const savedToGmail = justSaved && !state.gmailError;
  const showPendingUi = hasPendingDraft || savedToGmail;
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
    <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1 font-medium text-foreground">
          <Mail className="size-3" />
          {variant === "follow_up" ? "Follow-up email" : "Outreach email"}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <form action={formAction}>
            <Button type="submit" variant="outline" size="xs" disabled={isPending} className="gap-1">
              {isPending ? "Saving…" : "Save to Gmail"}
            </Button>
          </form>
          <CopyButton text={`Subject: ${email.subject}\n\n${email.body}`} />
          {showPendingUi && !sentConfirmed && (
            <>
              <a
                href={GMAIL_DRAFTS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-accent hover:underline"
              >
                Open Gmail drafts <ExternalLink className="size-3" />
              </a>
              <Button type="button" variant="ghost" size="xs" onClick={checkNow} disabled={isChecking} className="gap-1 text-muted-foreground">
                <RefreshCw className={`size-3 ${isChecking ? "animate-spin" : ""}`} />
                {isChecking ? "Checking…" : "Check if sent"}
              </Button>
            </>
          )}
          <label className="flex items-center gap-1 text-muted-foreground select-none">
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
      </div>
      {state.error && <p className="text-destructive">{state.error}</p>}
      {savedToGmail && (
        <p className="flex items-center gap-1 text-muted-foreground">
          <Check className="size-3" />
          Draft created in Gmail — review and send it from there.
        </p>
      )}
      {justSaved && state.gmailError && (
        <p className="text-warning">Couldn&apos;t save it to Gmail ({state.gmailError}) — copy it above and send it another way.</p>
      )}
      {sentConfirmed && <p className="text-success">Confirmed sent — marked as contacted.</p>}
      {checkResult === "pending" && <p className="text-muted-foreground">Still sitting in Drafts — not sent yet.</p>}
      {checkResult === "gone" && <p className="text-muted-foreground">Draft no longer exists (deleted, not sent).</p>}
      <p className="font-medium">{email.subject}</p>
      <p className="whitespace-pre-line text-muted-foreground">{email.body}</p>
    </div>
  );
}

function CallScriptSection({ leadId, phone, script }: { leadId: string; phone: string | null; script: SalesKit["call_script"] }) {
  const [marked, setMarked] = useState(false);
  const [isMarking, startMarking] = useTransition();

  function markCalled() {
    startMarking(async () => {
      await markLeadCalled(leadId);
      setMarked(true);
    });
  }

  const text = [
    `Opener: ${script.opener}`,
    "",
    "Talking points:",
    ...script.talking_points.map((p) => `- ${p}`),
    "",
    `If hesitant: ${script.if_hesitant}`,
    "",
    `Ask: ${script.closing_ask}`,
  ].join("\n");

  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1 font-medium text-foreground">
          <Phone className="size-3" />
          Call script
        </p>
        <div className="flex items-center gap-1.5">
          {phone ? (
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="font-medium text-accent hover:underline">
              {phone}
            </a>
          ) : (
            <span className="text-muted-foreground">No phone on file</span>
          )}
          <CopyButton text={text} />
          <Button type="button" variant={marked ? "outline" : "default"} size="xs" onClick={markCalled} disabled={isMarking || marked} className="gap-1">
            <PhoneCall className="size-3" />
            {marked ? "Marked as called" : isMarking ? "Marking…" : "Mark as called"}
          </Button>
        </div>
      </div>
      <p>
        <span className="font-medium text-foreground">Opener: </span>
        {script.opener}
      </p>
      <ul className="list-disc space-y-0.5 pl-4">
        {script.talking_points.map((point, i) => (
          <li key={i}>{point}</li>
        ))}
      </ul>
      <p>
        <span className="font-medium text-foreground">If hesitant: </span>
        {script.if_hesitant}
      </p>
      <p>
        <span className="font-medium text-foreground">Ask: </span>
        {script.closing_ask}
      </p>
    </div>
  );
}

// Cached sales kit (see draft-sales-kit.ts — six artifacts from one Claude
// call), rendered here and regenerated only on an explicit click, never on
// page load. `initialKit`/`initialGeneratedAt` come from the DB so an
// already-generated lead shows its kit immediately.
export function SalesKitButton({
  leadId,
  phone,
  isFollowUp,
  hasPendingDraft,
  alreadySent,
  initialKit,
  initialGeneratedAt,
}: {
  leadId: string;
  phone: string | null;
  isFollowUp: boolean;
  hasPendingDraft: boolean;
  alreadySent: boolean;
  initialKit: SalesKit | null;
  initialGeneratedAt: string | null;
}) {
  const boundAction = generateSalesKit.bind(null, leadId);
  const [state, formAction, isPending] = useActionState<SalesKitState, FormData>(boundAction, {});
  const [expanded, setExpanded] = useState(false);

  const kit = state.kit ?? initialKit;
  const generatedAt = state.generatedAt ?? initialGeneratedAt;
  const hasKit = Boolean(kit);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <form action={formAction}>
          <Button type="submit" variant="outline" size="xs" disabled={isPending} className="gap-1">
            <Sparkles className="size-3" />
            {isPending ? "Generating…" : hasKit ? "Re-generate sales kit" : "Generate sales kit"}
          </Button>
        </form>
        {hasKit && generatedAt && <span className="text-xs text-muted-foreground">Generated {timeAgo(generatedAt)}</span>}
        {hasKit && (
          <Button type="button" variant="ghost" size="xs" onClick={() => setExpanded((v) => !v)} className="gap-1 text-muted-foreground">
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {expanded ? "Hide" : "Show"} kit
          </Button>
        )}
      </div>
      {state.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
      {hasKit && kit && expanded && (
        <div className="mt-2 space-y-2">
          <KitEmailSection
            leadId={leadId}
            variant={isFollowUp ? "follow_up" : "outreach"}
            email={isFollowUp ? kit.follow_up_email : kit.outreach_email}
            hasPendingDraft={hasPendingDraft}
            alreadySent={alreadySent}
          />
          <CallScriptSection leadId={leadId} phone={phone} script={kit.call_script} />

          <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1 font-medium text-foreground">
                <MessageSquareText className="size-3" />
                LinkedIn message
              </p>
              <CopyButton text={kit.linkedin_message} />
            </div>
            <p className="text-muted-foreground">{kit.linkedin_message}</p>
          </div>

          <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1 font-medium text-foreground">
                <CalendarDays className="size-3" />
                Meeting agenda
              </p>
              <CopyButton text={kit.meeting_agenda.map((a) => `- ${a}`).join("\n")} />
            </div>
            <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
              {kit.meeting_agenda.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1 font-medium text-foreground">
                <FileText className="size-3" />
                Proposal outline
              </p>
              <CopyButton
                text={[
                  kit.proposal_outline.overview,
                  "",
                  "Included:",
                  ...kit.proposal_outline.included.map((i) => `- ${i}`),
                  "",
                  `Timeline: ${kit.proposal_outline.timeline_note}`,
                ].join("\n")}
              />
            </div>
            <p className="text-muted-foreground">{kit.proposal_outline.overview}</p>
            <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
              {kit.proposal_outline.included.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Timeline: </span>
              {kit.proposal_outline.timeline_note}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
