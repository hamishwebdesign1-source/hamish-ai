"use client";

import { useActionState, useEffect, useRef } from "react";
import { Mail } from "lucide-react";
import { generateLeadEmailDraft, type DraftEmailState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

const LOADING_PAGE =
  'data:text/html,<title>Drafting…</title><body style="font-family:sans-serif;padding:2rem;color:#666">Drafting your email…</body>';

// Drafts a personalised outreach email for this lead, then opens it in
// Gmail compose (never an auto-send — the operator always reviews and
// hits send). The tab is opened synchronously inside the click handler
// (not the effect that fires once the async draft comes back) so
// browsers don't treat it as an unrequested popup and block it.
export function EmailLeadButton({ leadId, email }: { leadId: string; email: string | null }) {
  const boundAction = generateLeadEmailDraft.bind(null, leadId);
  const [state, formAction, isPending] = useActionState<DraftEmailState, FormData>(boundAction, {});
  const popupRef = useRef<Window | null>(null);
  const openedForRef = useRef<DraftEmailState | null>(null);

  useEffect(() => {
    if (state.subject && state.body && openedForRef.current !== state) {
      openedForRef.current = state;
      const params = new URLSearchParams({
        view: "cm",
        fs: "1",
        to: email ?? "",
        su: state.subject,
        body: state.body,
      });
      const url = `https://mail.google.com/mail/?${params.toString()}`;

      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.location.href = url;
      } else {
        window.open(url, "_blank");
      }
    }
  }, [state, email]);

  return (
    <form
      action={formAction}
      onSubmit={() => {
        popupRef.current = window.open(LOADING_PAGE, "_blank");
      }}
    >
      <Button type="submit" variant="outline" size="xs" disabled={isPending} className="gap-1">
        <Mail className="size-3" />
        {isPending ? "Drafting…" : "Email"}
      </Button>
      {state.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
