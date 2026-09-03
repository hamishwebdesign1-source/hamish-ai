"use client";

import { useState, useTransition } from "react";
import { Copy, Mail, PhoneCall, FileText, Calendar, MessageCircle, Send, LoaderCircle, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sendProposal, generateSalesKit } from "@/app/studio/(authed)/prospects/actions";
import type { SalesKit } from "@/lib/draft-sales-kit";
import { appendBookingLink } from "@/lib/booking-link";
import type { Prospect, ProposalToken } from "./types";

// Small, local — copies its own text and shows a brief confirmation, no
// shared state needed since each outreach piece has its own button.
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1 rounded-md py-1.5 text-[11px] text-muted-foreground hover:text-accent"
    >
      <Copy className="size-3" /> {copied ? "Copied" : "Copy"}
    </button>
  );
}

function SendProposalControl({ prospectId, prospectEmail, proposalToken }: { prospectId: string; prospectEmail: string | null; proposalToken: ProposalToken | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  function send() {
    setError(null);
    startTransition(async () => {
      const r = await sendProposal(prospectId);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to send — try again.");
        return;
      }
      setJustSent(true);
    });
  }

  if (proposalToken?.accepted_at) {
    return <Badge variant="success">Accepted</Badge>;
  }
  if (justSent || proposalToken) {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Badge variant={proposalToken?.viewed_at ? "secondary" : "outline"}>{proposalToken?.viewed_at ? "Viewed" : "Sent"}</Badge>
        <button type="button" onClick={send} disabled={pending || !prospectEmail} className="underline underline-offset-2 hover:no-underline disabled:opacity-50">
          {pending ? "Resending…" : "Resend"}
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={send}
        disabled={pending || !prospectEmail}
        title={prospectEmail ? undefined : "This prospect has no contact email on file."}
        className="flex shrink-0 items-center gap-1 text-[11px] text-accent underline underline-offset-2 hover:no-underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
      >
        <Send className="size-3" /> {pending ? "Sending…" : "Send proposal"}
      </button>
      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </span>
  );
}

function SalesKitPreview({
  kit,
  bookingLink,
  prospectId,
  prospectEmail,
  proposalToken,
}: {
  kit: SalesKit;
  bookingLink: string | null;
  prospectId: string;
  prospectEmail: string | null;
  proposalToken: ProposalToken | null;
}) {
  // Roadmap item #9 — same deterministic append sendForOrg() (autonomous-
  // outreach.ts) applies before an automated send, applied here so a
  // human copying either draft out to send themselves sees (and sends)
  // the exact same booking link, not a shorter version that quietly
  // diverges from what an automated follow-up would have included.
  const outreachBody = appendBookingLink(kit.outreach_email.body, bookingLink);
  const followUpBody = appendBookingLink(kit.follow_up_email.body, bookingLink);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><Mail className="size-3.5 shrink-0 text-muted-foreground" /> Outreach email</p>
          <CopyButton text={`${kit.outreach_email.subject}\n\n${outreachBody}`} />
        </div>
        <p className="mt-2 text-xs font-medium">{kit.outreach_email.subject}</p>
        <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{outreachBody}</p>
      </div>

      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><Mail className="size-3.5 shrink-0 text-muted-foreground" /> Follow-up email</p>
          <CopyButton text={`${kit.follow_up_email.subject}\n\n${followUpBody}`} />
        </div>
        <p className="mt-2 text-xs font-medium">{kit.follow_up_email.subject}</p>
        <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{followUpBody}</p>
      </div>

      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><PhoneCall className="size-3.5 shrink-0 text-muted-foreground" /> Call script</p>
          <CopyButton
            text={`Opener: ${kit.call_script.opener}\n\nTalking points:\n${kit.call_script.talking_points.map((t) => `- ${t}`).join("\n")}\n\nIf hesitant: ${kit.call_script.if_hesitant}\n\nClosing ask: ${kit.call_script.closing_ask}`}
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{kit.call_script.opener}</p>
        <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
          {kit.call_script.talking_points.map((t) => (
            <li key={t}>• {t}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><MessageCircle className="size-3.5 shrink-0 text-muted-foreground" /> LinkedIn message</p>
          <CopyButton text={kit.linkedin_message} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{kit.linkedin_message}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><Calendar className="size-3.5 shrink-0 text-muted-foreground" /> Meeting agenda</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {kit.meeting_agenda.map((a) => (
              <li key={a}>• {a}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold"><FileText className="size-3.5 shrink-0 text-muted-foreground" /> Proposal outline</p>
            <div className="flex shrink-0 items-center gap-3">
              <SendProposalControl prospectId={prospectId} prospectEmail={prospectEmail} proposalToken={proposalToken} />
              {/* Roadmap item #6 — plain same-origin navigation, not a fetch:
                  the browser's own session cookie is what authorises this
                  (proposal-pdf/route.ts), same as any other in-app link. */}
              <a
                href={`/api/studio/prospects/${prospectId}/proposal-pdf`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-[11px] text-accent underline underline-offset-2 hover:no-underline"
              >
                Download PDF
              </a>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{kit.proposal_outline.overview}</p>
          <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
            {kit.proposal_outline.included.map((i) => (
              <li key={i}>• {i}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function SalesKitSection({ prospect, bookingLink, proposalToken }: { prospect: Prospect; bookingLink: string | null; proposalToken: ProposalToken | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {prospect.sales_kit ? (
        <SalesKitPreview
          kit={prospect.sales_kit}
          bookingLink={bookingLink}
          prospectId={prospect.id}
          prospectEmail={prospect.email}
          proposalToken={proposalToken}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">Not generated yet — email, follow-up, call script, LinkedIn message, meeting agenda and proposal outline, in one go.</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const r = await generateSalesKit(prospect.id);
                if (r && "error" in r) setError(r.error ?? "Sales kit generation failed.");
              })
            }
          >
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
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
