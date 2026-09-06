"use client";

import { useEffect } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConfirmDelete, type UseConfirmDeleteOptions } from "@/lib/use-confirm-delete";

type ConfirmDeleteButtonProps = UseConfirmDeleteOptions & {
  onDelete: () => Promise<{ error?: string } | Record<string, unknown> | undefined | void>;
  // aria-label for the resting trigger button, e.g. "Delete", "Delete
  // task", "Delete this project", "Remove jane@business.com".
  label: string;
  // aria-label for the X cancel button while confirming. Defaults to
  // "Cancel delete" (knowledge-panel.tsx's EntryCard, DeliverableRow,
  // TaskRow, both project detail-page delete controls, CampaignCard);
  // pass "Cancel remove" for a member-removal context (ClientMembersControl,
  // team-panel.tsx).
  cancelLabel?: string;
  // Text on the destructive confirm button while idle. Defaults to
  // "Confirm" (the majority shape); DeleteProjectControl/
  // DeleteWebsiteProjectControl use the longer "Confirm delete".
  confirmText?: string;
  // Text on the confirm button while pending. Defaults to "…" (the
  // majority shape); DeleteProjectControl/DeleteWebsiteProjectControl use
  // "Deleting…".
  pendingText?: string;
  // Trigger + cancel button size — "icon" (knowledge-panel.tsx's EntryCard,
  // project-deliverable-list.tsx, project-task-list.tsx) or "icon-xs"
  // (both detail-page delete controls, CampaignCard, member-removal rows).
  size?: "icon" | "icon-xs";
  // Trash2 (resting trigger) icon size class — "size-3.5" (the "icon"-size
  // sites) or "size-3" (most "icon-xs"-size sites) — pass per call site to
  // stay pixel-exact rather than guessing one default for every site.
  iconClassName?: string;
  // X (cancel) icon size class while confirming. A few "icon-xs" sites pair
  // a "size-3.5" Trash2 with a "size-3" X (DeleteProjectControl,
  // DeleteWebsiteProjectControl) — defaults to `iconClassName` for every
  // site where both icons match.
  cancelIconClassName?: string;
  // Whether the trigger's Trash2 icon itself gets the muted-foreground
  // tint (true everywhere except CampaignCard's plain-icon-colour trigger).
  mutedIcon?: boolean;
  // Renders the error inline right after the confirm/cancel pair — the
  // shape both project detail-page delete controls and
  // prospecting/remove-prospect-control.tsx already use. Set to false and
  // read the error via `onErrorChange` when a site needs to render it
  // somewhere else instead (a block below the row's other content, e.g.
  // knowledge-panel.tsx's EntryCard) — see that hook option's own comment.
  showInlineError?: boolean;
  onErrorChange?: (error: string | null) => void;
  className?: string;
};

// Studio Design Audit follow-up (BACKLOG.md, "Build StudioEmptyState and
// ConfirmDeleteButton shared primitives") — the rendered trigger/confirm/
// cancel trio for every site whose confirm-before-delete control is
// visually the icon Trash2-then-destructive-"Confirm"-plus-X pair
// (knowledge-panel.tsx's EntryCard is the original, most-copied shape).
// Built on useConfirmDelete() (use-confirm-delete.ts); sites with a
// genuinely different trigger shape (a labelled button, explanatory copy)
// use that hook directly instead of forcing their JSX through this
// component — see the hook's own comment for which sites and why.
export function ConfirmDeleteButton({
  onDelete,
  label,
  cancelLabel = "Cancel delete",
  confirmText = "Confirm",
  pendingText = "…",
  size = "icon",
  iconClassName = "size-3.5",
  cancelIconClassName,
  mutedIcon = true,
  showInlineError = false,
  onErrorChange,
  fallbackError,
  onSuccess,
  keepConfirmingOnError,
  className,
}: ConfirmDeleteButtonProps) {
  const { confirming, pending, error, start, cancel, confirmDelete } = useConfirmDelete(onDelete, {
    fallbackError,
    onSuccess,
    keepConfirmingOnError,
  });

  useEffect(() => {
    onErrorChange?.(error);
    // onErrorChange intentionally excluded — call sites pass an inline
    // setState function, and including it would re-fire this effect every
    // render for callers that don't memoize it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  if (confirming) {
    return (
      <span className={cn("flex shrink-0 items-center gap-1", className)}>
        <Button size="xs" variant="destructive" disabled={pending} onClick={confirmDelete}>
          {pending ? pendingText : confirmText}
        </Button>
        <Button size={size} variant="ghost" aria-label={cancelLabel} onClick={cancel}>
          <X className={cancelIconClassName ?? iconClassName} />
        </Button>
        {showInlineError && error && <span className="text-xs text-destructive">{error}</span>}
      </span>
    );
  }

  return (
    <Button size={size} variant="ghost" aria-label={label} onClick={start} className={className}>
      <Trash2 className={cn(iconClassName, mutedIcon && "text-muted-foreground")} />
    </Button>
  );
}
