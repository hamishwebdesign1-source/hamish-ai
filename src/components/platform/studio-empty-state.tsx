import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StudioEmptyStateProps = {
  icon?: LucideIcon;
  title?: ReactNode;
  description: ReactNode;
  // A pre-built control (Button/Link), rendered by the caller — this
  // component never owns a Server Action or its own pending/error state
  // (prospecting/research-summary.tsx's "Research this business",
  // sales-kit-section.tsx's "Generate sales kit", and
  // website-mockup-section.tsx's "Generate mockup" each keep their own
  // useTransition/error handling exactly as before, just passing the
  // already-wired Button in here).
  action?: ReactNode;
  // "lg" (p-8, size-6 icon, rounded-xl) — the "nothing here at all yet"
  // shape used across Knowledge, Clients, Campaigns, Projects, Website
  // Builder, Requests, and the Prompt Library.
  // "sm" (p-6, rounded-xl, no icon by default) — the "nothing matches
  // your search/filter" shape used by the same pages' own secondary empty
  // state.
  // "xs" (p-4, rounded-lg, no icon by default) — the compact "not
  // generated yet" + CTA shape used by the three prospecting AI-artifact
  // sections (research, sales kit, website mockup).
  // Defaults to "lg" when an icon is given, "sm" otherwise — matches every
  // real site's own pairing (no current site shows an icon at the "sm"/"xs"
  // sizes), but is still overridable.
  size?: "lg" | "sm" | "xs";
  className?: string;
};

const SIZE_STYLES: Record<NonNullable<StudioEmptyStateProps["size"]>, { rounded: string; padding: string; icon: string }> = {
  lg: { rounded: "rounded-xl", padding: "p-8", icon: "size-6" },
  sm: { rounded: "rounded-xl", padding: "p-6", icon: "size-5" },
  xs: { rounded: "rounded-lg", padding: "p-4", icon: "size-5" },
};

// Studio Design Audit follow-up (BACKLOG.md, "Build StudioEmptyState and
// ConfirmDeleteButton shared primitives") — the dashed-border empty-state
// card duplicated by hand across the app, consolidated into one component.
// Matches the real, already-in-use visual shape exactly (see the three
// named sizes above) rather than inventing a new one — every one of this
// component's adopting call sites is a straight extraction of markup that
// already existed. Outer vertical spacing (mt-3/mt-4/mt-6/mt-8, or none)
// stays the caller's own responsibility via `className`, since that varies
// by what sits above it on each page, not by the empty state itself.
export function StudioEmptyState({ icon: Icon, title, description, action, size, className }: StudioEmptyStateProps) {
  const resolvedSize = size ?? (Icon ? "lg" : "sm");
  const styles = SIZE_STYLES[resolvedSize];
  const hasLeadIn = Boolean(Icon || title);

  return (
    <div className={cn(styles.rounded, "border border-dashed border-border text-center", styles.padding, className)}>
      {Icon && <Icon className={cn("mx-auto text-muted-foreground", styles.icon)} />}
      {title && <p className={cn("text-sm font-medium", Icon && "mt-2")}>{title}</p>}
      <p className={cn("text-sm text-muted-foreground", hasLeadIn && "mt-3")}>{description}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}
