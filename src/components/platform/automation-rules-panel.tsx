"use client";

import { useState, useTransition } from "react";
import { Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { updateAutoDraftRule } from "@/app/studio/(authed)/settings/actions";

// Roadmap item #10 — deliberately framed as one real rule, not a builder:
// see automation-rules.ts's own comment on why a genuinely generic
// condition/action engine is a bigger, separate product conversation.
export function AutomationRulesPanel({ enabled }: { enabled: boolean }) {
  const [checked, setChecked] = useState(enabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(next: boolean) {
    setError(null);
    startTransition(async () => {
      const r = await updateAutoDraftRule(next);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to save.");
      } else {
        setChecked(next);
      }
    });
  }

  return (
    <Card>
      <CardContent>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            disabled={pending}
            onChange={(e) => toggle(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-accent"
          />
          <span>
            <span className="flex items-center gap-1.5 font-heading text-sm font-semibold">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Zap className="size-4" />
              </span>
              Auto-draft high-scoring prospects
            </span>
            <span className="mt-2 block text-sm text-muted-foreground">
              When a researched prospect scores 4+ and has sat untouched for a few days, HamishAI drafts their
              sales kit automatically — ready for you to review in Prospects. It never sends anything; a human
              still reviews and sends every first outreach.
            </span>
          </span>
        </label>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
