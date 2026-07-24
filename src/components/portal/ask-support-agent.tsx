"use client";

import { useActionState } from "react";
import { askQuestion, type AskState } from "@/app/portal/actions";

export function AskSupportAgent({ clientId }: { clientId: string }) {
  const boundAction = askQuestion.bind(null, clientId);
  const [state, formAction, isPending] = useActionState<AskState, FormData>(boundAction, {});

  return (
    <div className="rounded-xl border border-border p-5">
      <h2 className="font-heading text-lg font-medium">Ask a question</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Quick questions get an instant answer. Anything bigger, submit it as a request below.
      </p>
      <form action={formAction} className="mt-4 space-y-3">
        <textarea
          name="question"
          required
          rows={2}
          placeholder="e.g. How do I update my opening hours myself?"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <button
          type="submit"
          disabled={isPending}
          className="h-9 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
        >
          {isPending ? "Thinking…" : "Ask"}
        </button>
      </form>
      {state.answer && (
        <p className="mt-4 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm">{state.answer}</p>
      )}
      {state.error && <p className="mt-4 text-sm text-destructive">{state.error}</p>}
    </div>
  );
}
