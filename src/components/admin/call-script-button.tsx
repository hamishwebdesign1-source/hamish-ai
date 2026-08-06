"use client";

import { useActionState, useState, useTransition } from "react";
import { Phone, Copy, Check, PhoneCall } from "lucide-react";
import { generateLeadCallScript, markLeadCalled, type CallScriptState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

// Unlike EmailLeadButton (which hands off to Gmail compose), a phone call
// has no external app to open — the script is meant to be glanced at
// during the call itself, so it renders inline in an expandable panel
// right here rather than opening anything.
export function CallScriptButton({ leadId, phone }: { leadId: string; phone: string | null }) {
  const boundAction = generateLeadCallScript.bind(null, leadId);
  const [state, formAction, isPending] = useActionState<CallScriptState, FormData>(boundAction, {});
  const [copied, setCopied] = useState(false);
  const [marked, setMarked] = useState(false);
  const [isMarking, startMarking] = useTransition();

  function markCalled() {
    startMarking(async () => {
      await markLeadCalled(leadId);
      setMarked(true);
    });
  }

  const hasScript = Boolean(state.opener);

  function scriptText() {
    return [
      `Opener: ${state.opener}`,
      "",
      "Talking points:",
      ...(state.talkingPoints ?? []).map((p) => `- ${p}`),
      "",
      `If hesitant: ${state.ifHesitant}`,
      "",
      `Ask: ${state.closingAsk}`,
    ].join("\n");
  }

  async function copyScript() {
    await navigator.clipboard.writeText(scriptText());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <form action={formAction}>
        <Button type="submit" variant="outline" size="xs" disabled={isPending} className="gap-1">
          <Phone className="size-3" />
          {isPending ? "Drafting…" : hasScript ? "Re-draft call script" : "Call script"}
        </Button>
      </form>
      {state.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
      {hasScript && (
        <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            {phone ? (
              <a href={`tel:${phone.replace(/\s+/g, "")}`} className="font-medium text-accent hover:underline">
                {phone}
              </a>
            ) : (
              <span className="text-muted-foreground">No phone number on file yet</span>
            )}
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="xs" onClick={copyScript} className="gap-1">
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                type="button"
                variant={marked ? "outline" : "default"}
                size="xs"
                onClick={markCalled}
                disabled={isMarking || marked}
                className="gap-1"
              >
                <PhoneCall className="size-3" />
                {marked ? "Marked as called" : isMarking ? "Marking…" : "Mark as called"}
              </Button>
            </div>
          </div>
          <p>
            <span className="font-medium text-foreground">Opener: </span>
            {state.opener}
          </p>
          <ul className="list-disc space-y-0.5 pl-4">
            {state.talkingPoints?.map((point, i) => <li key={i}>{point}</li>)}
          </ul>
          <p>
            <span className="font-medium text-foreground">If hesitant: </span>
            {state.ifHesitant}
          </p>
          <p>
            <span className="font-medium text-foreground">Ask: </span>
            {state.closingAsk}
          </p>
        </div>
      )}
    </div>
  );
}
