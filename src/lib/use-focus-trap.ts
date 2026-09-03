"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Studio Design Audit, Tier 5 item #14 — studio-command-palette.tsx and
// studio-assistant-widget.tsx are both hand-rolled full-screen/panel
// overlays (their own backdrop/click-outside/Escape logic, not
// src/components/ui/dialog.tsx's <Dialog>), so neither got that
// component's `role="dialog"`/`aria-modal="true"` and neither trapped
// focus — a keyboard user could Tab out of either into the page behind
// it. This is the shared piece: a basic Tab-wrap focus trap, kept
// deliberately simple per the audit's own scoping (cycle focus between
// the first and last focusable element inside the panel on Tab/
// Shift+Tab) rather than a full focus-trap library. It doesn't manage
// initial focus or restore focus on close — callers already handle their
// own autofocus (e.g. the command palette's own requestAnimationFrame
// input focus), this only stops focus escaping at the edges while open.
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeInPanel = container.contains(document.activeElement);

      if (e.shiftKey) {
        if (!activeInPanel || document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (!activeInPanel || document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [containerRef, active]);
}
