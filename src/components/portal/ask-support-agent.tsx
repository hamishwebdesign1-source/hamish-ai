"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { askQuestion, type AskState } from "@/app/portal/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function AskSupportAgent({ clientId }: { clientId: string }) {
  const boundAction = askQuestion.bind(null, clientId);
  const [state, formAction, isPending] = useActionState<AskState, FormData>(boundAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-accent" />
          Ask a question
        </CardTitle>
        <CardDescription>
          Quick questions get an instant answer. Anything bigger, submit it as a request below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="mt-2 space-y-3">
          <Textarea
            name="question"
            required
            rows={2}
            placeholder="e.g. How do I update my opening hours myself?"
          />
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Thinking…" : "Ask"}
          </Button>
        </form>
        {state.answer && (
          <p className="mt-4 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm">{state.answer}</p>
        )}
        {state.error && <p className="mt-4 text-sm text-destructive">{state.error}</p>}
      </CardContent>
    </Card>
  );
}
