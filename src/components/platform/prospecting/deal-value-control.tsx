"use client";

import { useState, useTransition } from "react";
import { PoundSterling } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateProspectDealValue } from "@/app/studio/(authed)/prospects/actions";
import type { Prospect } from "./types";

function formatMoney(pence: number) {
  return `£${(pence / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

// Entirely optional, never AI-generated — see updateProspectDealValue()'s
// own comment on why a made-up number would be worse than no number.
export function DealValueControl({ prospect }: { prospect: Prospect }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(prospect.deal_value_pence ? String(prospect.deal_value_pence / 100) : "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Flagged in BACKLOG.md's useOptimistic scoping note as safe but too
  // low-frequency to be worth bespoke optimistic-UI engineering — the real
  // bug here was that the result was never checked at all, silently
  // reverting to the stale value on a failed save. Fixed as an ordinary
  // bug fix: check the result, keep the editor open with the same inline
  // error convention as everything else in this file on failure.
  function save() {
    setError(null);
    startTransition(async () => {
      const parsed = value.trim() ? parseFloat(value) : null;
      const r = await updateProspectDealValue(prospect.id, parsed);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to update — try again.");
        return;
      }
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setEditing(true);
        }}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent"
      >
        <PoundSterling className="size-3" />
        {prospect.deal_value_pence ? formatMoney(prospect.deal_value_pence) : "Add deal value"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          autoFocus
          className="h-7 w-24 text-xs"
          placeholder="£"
        />
        <Button size="xs" disabled={pending} onClick={save}>
          {pending ? "…" : "Save"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
