"use client";

import { useOptimistic, useState, useTransition } from "react";
import { CheckCheck, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markProspectQualified, markProspectLost } from "@/app/studio/(authed)/prospects/actions";
import type { Prospect } from "./types";

// Platform readiness audit P1: a real pipeline beyond needs_verification
// -> contacted -> converted, which had no room for "reviewed, worth
// pursuing" or "pursued, didn't work out." Hidden once the prospect has
// reached either of its own terminal states (converted, or already
// lost) — a won or lost deal isn't still "qualifiable."
// Same useOptimistic-from-scratch treatment as ContactTrackingControl
// above, per the same scoping note — see its comment for why.
export function PipelineStageControl({ prospect }: { prospect: Prospect }) {
  const [optimisticProspect, setOptimisticProspect] = useOptimistic(
    prospect,
    (state: Prospect, patch: Partial<Prospect>) => ({ ...state, ...patch })
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rolledBack, setRolledBack] = useState(false);

  function flagRollback() {
    setRolledBack(true);
    setTimeout(() => setRolledBack(false), 1500);
  }

  // Checked against the real, server-confirmed prop, not the optimistic
  // local guess — an in-flight (unconfirmed) "mark as lost" click sets
  // optimisticProspect.status to "lost" immediately, and if this guard
  // read that instead, the whole row (and its own rollback error message)
  // would disappear before the server ever confirmed the write, which
  // would defeat the rollback UI below. Once the write actually succeeds,
  // revalidatePath refreshes this prop for real and the row correctly
  // disappears for good.
  if (prospect.status === "converted" || prospect.status === "lost") return null;

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center gap-2 rounded-md p-1 transition-colors ${rolledBack ? "bg-destructive/10" : ""}`}>
        {optimisticProspect.status === "lost" ? (
          <span className="text-xs text-muted-foreground">Marked as lost…</span>
        ) : (
          <>
            {optimisticProspect.status !== "qualified" && (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    setOptimisticProspect({ status: "qualified" });
                    const r = await markProspectQualified(prospect.id);
                    if (r && "error" in r) {
                      setError(r.error ?? "Failed to update — try again.");
                      flagRollback();
                    }
                  })
                }
              >
                <CheckCheck className="size-3.5" /> Mark as qualified
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  setOptimisticProspect({ status: "lost" });
                  const r = await markProspectLost(prospect.id);
                  if (r && "error" in r) {
                    setError(r.error ?? "Failed to update — try again.");
                    flagRollback();
                  }
                })
              }
            >
              <ThumbsDown className="size-3.5" /> Mark as lost
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
