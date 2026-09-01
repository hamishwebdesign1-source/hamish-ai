"use client";

import { useState, useTransition } from "react";
import { Radar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { updateCompetitiveIntel } from "@/app/studio/(authed)/settings/actions";

// Roadmap item #7 — same resting/pending/error shape as the other
// Settings toggles, minus a "saved" state: this is a plain on/off, not a
// value worth confirming was written.
export function CompetitiveIntelPanel({ enabled }: { enabled: boolean }) {
  const [checked, setChecked] = useState(enabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(next: boolean) {
    setError(null);
    startTransition(async () => {
      const r = await updateCompetitiveIntel(next);
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
                <Radar className="size-4" />
              </span>
              Competitive intelligence
            </span>
            <span className="mt-2 block text-sm text-muted-foreground">
              Once a month, HamishAI researches a real, current move from a competitor of a few of your clients —
              a redesign, a new offer, anything worth mentioning at your next check-in. Never invented: if nothing
              genuine turns up, nothing gets added.
            </span>
          </span>
        </label>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
