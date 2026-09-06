"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProspect } from "@/app/studio/(authed)/prospects/actions";
import { useConfirmDelete } from "@/lib/use-confirm-delete";
import type { Prospect } from "./types";

// Two-step confirm, same shape as ConvertToClientControl's open/confirm
// state — a single click can't remove a prospect outright, since unlike
// most actions here this one isn't reversible. Never shown for a
// converted prospect, matching deleteProspect()'s own server-side refusal
// (it's now a client, not something to remove from here).
//
// Uses useConfirmDelete() directly (not <ConfirmDeleteButton>) — this
// control's trigger/confirm shape (labelled "Remove" button, "Remove this
// prospect?" copy, labelled Cancel/Confirm pair) doesn't match the icon
// Trash2/X pair every ConfirmDeleteButton site shares, see that
// component's own comment.
export function RemoveProspectControl({ prospect }: { prospect: Prospect }) {
  const { confirming, pending, error, start, cancel, confirmDelete } = useConfirmDelete(() => deleteProspect(prospect.id), {
    fallbackError: "Failed to remove.",
    keepConfirmingOnError: false,
  });

  if (prospect.status === "converted") return null;

  if (!confirming) {
    return (
      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={start}>
        <Trash2 className="size-3.5" /> Remove
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Remove this prospect?</span>
      <Button size="sm" variant="destructive" disabled={pending} onClick={confirmDelete}>
        {pending ? "…" : "Confirm"}
      </Button>
      <Button size="sm" variant="ghost" onClick={cancel}>
        Cancel
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
