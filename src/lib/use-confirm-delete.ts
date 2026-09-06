"use client";

import { useState, useTransition } from "react";

type DeleteActionResult = { error?: string } | Record<string, unknown> | undefined | void;

export type UseConfirmDeleteOptions = {
  // Message shown when the Server Action rejects but returns no `error`
  // string of its own — matches every existing hand-rolled implementation's
  // own `r.error ?? "Failed to …"` fallback.
  fallbackError?: string;
  // Called once the action resolves without an `error` field. Every site
  // that needs a real side effect on success (DeleteProjectControl's
  // `router.push`, CampaignCard's `setDeleted(true)`) passes one; sites
  // that rely on `revalidatePath` unmounting the row themselves
  // (knowledge-panel.tsx's EntryCard, project-task-list.tsx's TaskRow)
  // don't need to.
  onSuccess?: () => void;
  // Whether the confirm/cancel pair stays open with the error shown after
  // a failed delete (true — the pattern almost every site here already
  // uses: EntryCard, DeliverableRow, TaskRow, DeleteProjectControl,
  // ClientMembersControl) or collapses back to the trigger button (false —
  // team-panel.tsx's own pre-existing, deliberately-preserved exception,
  // see its own call site comment).
  keepConfirmingOnError?: boolean;
};

// Studio Design Audit follow-up (BACKLOG.md, "Build StudioEmptyState and
// ConfirmDeleteButton shared primitives") — the confirming/pending/error
// state machine behind every hand-rolled confirm-before-destructive-action
// control in this codebase (knowledge-panel.tsx's EntryCard is the
// original), extracted so the same three `useState`s + `useTransition`
// don't keep getting retyped by hand. Deliberately just the state machine,
// not a rendered control — several real call sites (clients-panel.tsx's
// MaintenanceSubscriptionControl "Cancel subscription",
// prospecting/remove-prospect-control.tsx's "Remove") have a genuinely
// different trigger/confirm/cancel visual shape (a labelled button and/or
// explanatory copy, not the icon Trash2/X pair), so forcing them through a
// single rendered `<ConfirmDeleteButton>` would mean fighting the
// component's own JSX rather than reusing it — see `ConfirmDeleteButton`
// (confirm-delete-button.tsx) for the thin rendered wrapper used by every
// site whose visual shape *does* match.
export function useConfirmDelete(action: () => Promise<DeleteActionResult>, options?: UseConfirmDeleteOptions) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    setConfirming(true);
  }

  function cancel() {
    setConfirming(false);
    setError(null);
  }

  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      const r = await action();
      if (r && "error" in r) {
        setError((r.error as string | undefined) ?? options?.fallbackError ?? "Failed to delete.");
        if (options?.keepConfirmingOnError === false) setConfirming(false);
        return;
      }
      setConfirming(false);
      options?.onSuccess?.();
    });
  }

  return { confirming, pending, error, start, cancel, confirmDelete, setConfirming, setError } as const;
}
