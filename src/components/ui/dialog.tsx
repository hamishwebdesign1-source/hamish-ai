"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// Plain React portal + conditional rendering — NOT @base-ui/react/dialog.
// Found live-testing, reproduced across two Base UI versions (1.6.0 and
// 1.7.0) in both dev AND a genuine production build: Base UI's Popup
// waits for element.getAnimations() to resolve before actually unmounting
// (useAnimationsFinished/useOpenChangeComplete internals), and that
// promise never resolved in this app regardless of whether any CSS
// transition classes were present at all — even a completely unstyled,
// zero-className raw <Dialog.Popup> got permanently stuck open. Given
// the root cause sits inside a third-party library's internal animation-
// completion state machine, not anything in this app's own code, the
// pragmatic fix is a dialog with no such machinery to get stuck in: this
// implementation is a handful of lines of plain React, no exotic exit-
// animation detection, so "closed" always means closed.

type DialogContextValue = { open: boolean; setOpen: (open: boolean) => void }
const DialogContext = React.createContext<DialogContextValue | null>(null)

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}) {
  const setOpen = React.useCallback((next: boolean) => onOpenChange?.(next), [onOpenChange])
  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>
}

function useDialogContext() {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error("Dialog subcomponents must be used inside <Dialog>")
  return ctx
}

// Detects "has the client finished hydrating" without an effect+setState
// (the same react-hooks/set-state-in-effect concern as help-mode-context.tsx's
// own comment) — createPortal needs `document`, which doesn't exist
// during SSR. useSyncExternalStore returns the SSR-safe false for the
// server and the very first client render, then React automatically
// re-renders once truly mounted.
function subscribe() {
  return () => {}
}
function getSnapshot() {
  return true
}
function getServerSnapshot() {
  return false
}
function useIsMounted() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

function DialogContent({
  className,
  children,
  showClose = true,
}: {
  className?: string
  children: React.ReactNode
  showClose?: boolean
}) {
  const { open, setOpen } = useDialogContext()
  const mounted = useIsMounted()

  if (!open || !mounted) return null

  return createPortal(
    <>
      <div
        data-slot="dialog-backdrop"
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => setOpen(false)}
      />
      <div
        data-slot="dialog-content"
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-lg outline-none",
          className
        )}
      >
        {children}
        {showClose && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 rounded-md text-muted-foreground opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </div>
    </>,
    document.body
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="dialog-title" className={cn("font-heading text-lg font-semibold", className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="dialog-description" className={cn("mt-1.5 text-sm text-muted-foreground", className)} {...props} />
}

export { Dialog, DialogContent, DialogTitle, DialogDescription }
