// Plain CSS hover, not @base-ui/react/tooltip — same reasoning as
// dialog.tsx's own comment (Base UI's animation-completion machinery got
// permanently stuck in this app, reproduced across two versions in a real
// production build). A hover tooltip doesn't need JS state or portals at
// all: the content stays in the DOM and is shown/hidden purely via CSS
// group-hover/group-focus, so there's no unmount-timing machinery that
// could get stuck.
import { cn } from "@/lib/utils"

function Tooltip({ children }: { children: React.ReactNode }) {
  return <span className="group/tooltip relative inline-flex">{children}</span>
}

function TooltipTrigger({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="tooltip-trigger"
      tabIndex={0}
      className={cn("inline-flex outline-none", className)}
      {...props}
    >
      {children}
    </span>
  )
}

// Binary show/hide via `invisible`/`visible` only — no opacity fade.
// Found live-testing: `group-hover/tooltip:opacity-100` never actually
// applied even though the matching `group-hover/tooltip:visible` did
// (same class list, same variant, real hover confirmed via :hover
// matching) — some other rule in this app's cascade keeps overriding
// opacity specifically. Rather than chase a second cascade mystery after
// the Dialog one, dropping the fade guarantees the tooltip is actually
// visible on hover, which is what matters.
function TooltipContent({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="tooltip-content"
      role="tooltip"
      className={cn(
        "pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-64 -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md group-hover/tooltip:visible group-focus-within/tooltip:visible",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

// No-op — kept so call sites (help-tip.tsx) don't need to change; the
// CSS-only approach needs no provider/delay configuration.
function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
