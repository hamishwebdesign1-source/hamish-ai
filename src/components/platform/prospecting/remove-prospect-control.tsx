"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProspect } from "@/app/studio/(authed)/prospects/actions";
import type { Prospect } from "./types";

// Two-step confirm, same shape as ConvertToClientControl's open/confirm
// state — a single click can't remove a prospect outright, since unlike
// most actions here this one isn't reversible. Never shown for a
// converted prospect, matching deleteProspect()'s own server-side refusal
// (it's now a client, not something to remove from here).
export function RemoveProspectControl({ prospect }: { prospect: Prospect }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (prospect.status === "converted") return null;

  if (!confirming) {
    return (
      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setConfirming(true)}>
        <Trash2 className="size-3.5" /> Remove
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Remove this prospect?</span>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await deleteProspect(prospect.id);
            if (r && "error" in r) {
              setError(r.error ?? "Failed to remove.");
              setConfirming(false);
            }
          })
        }
      >
        {pending ? "…" : "Confirm"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
