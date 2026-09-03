"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Send, MessageSquareText, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markProspectContacted, markProspectReplied } from "@/app/studio/(authed)/prospects/actions";
import { getLeadCadenceAction } from "@/lib/lead-status";
import type { Prospect } from "./types";

function formatDaysAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

// Manual tracking, not automated — a tenant clicks these after they've
// actually emailed or called a prospect themselves. Hooking up a tenant's
// own inbox (Gmail/Outlook) so this fills in on its own is a real,
// separate feature (per-tenant OAuth, Google/Microsoft app verification),
// not something bolted on here.
// Built fresh with useOptimistic (BACKLOG.md's 2026-08-31 scoping note,
// candidate 1) rather than the hand-rolled useState-flip-then-revert
// pattern used elsewhere in this codebase (CampaignCard.toggleStatus etc)
// — there was no existing optimism here at all to migrate. Rollback UI
// per that same note: an inline text-destructive line under the row,
// plus a brief bg-destructive/10 highlight on the row itself, cleared
// after ~1.5s — the same transient-boolean-plus-timeout mechanism
// CopyButton/EmbedChatbotControl already use for their own "copied" state.
export function ContactTrackingControl({ prospect }: { prospect: Prospect }) {
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

  if (optimisticProspect.status === "converted") return null;

  const rowHighlight = rolledBack ? "bg-destructive/10" : "";

  if (!optimisticProspect.contacted_at) {
    return (
      <div className="flex flex-col gap-1">
        <div className={`flex items-center gap-2 rounded-md p-1 transition-colors ${rowHighlight}`}>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                setOptimisticProspect({ status: "contacted", contacted_at: new Date().toISOString(), last_contact_method: "email" });
                const r = await markProspectContacted(prospect.id);
                if (r && "error" in r) {
                  setError(r.error ?? "Failed to update — try again.");
                  flagRollback();
                }
              })
            }
          >
            <Send className="size-3.5" /> Mark as contacted
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  if (optimisticProspect.replied_at) {
    return (
      <Badge variant="secondary" className="gap-1">
        <MessageSquareText className="size-3" /> Replied
      </Badge>
    );
  }

  const cadenceAction = getLeadCadenceAction(optimisticProspect);

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex flex-wrap items-center gap-2 rounded-md p-1 transition-colors ${rowHighlight}`}>
        <span className="text-xs text-muted-foreground">
          Contacted {formatDaysAgo(optimisticProspect.contacted_at)}
          {optimisticProspect.last_contact_method ? ` by ${optimisticProspect.last_contact_method}` : ""}
        </span>
        {cadenceAction && (
          <span className="flex items-center gap-1 text-xs font-medium text-destructive">
            <BellRing className="size-3.5 shrink-0" />
            {cadenceAction === "call" ? "Call due" : "Follow-up due"}
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              setOptimisticProspect({ replied_at: new Date().toISOString() });
              const r = await markProspectReplied(prospect.id);
              if (r && "error" in r) {
                setError(r.error ?? "Failed to update — try again.");
                flagRollback();
              }
            })
          }
        >
          <MessageSquareText className="size-3.5" /> Mark as replied
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
