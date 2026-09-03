import type { ReactNode } from "react";
import { Eyebrow } from "@/components/eyebrow";

// Studio Design Audit, Tier 1 item #1 — every one of Studio's 12
// non-Command-Centre pages hand-rolled the identical h1/p header pair
// (18 duplicated instances across the panels and their own route
// page.tsx files), each inside a different, content-unjustified
// max-width (max-w-2xl/3xl/4xl/5xl) — the reading column visibly jumped
// width on every nav click, the single most "assembled from parts"
// issue the audit found. This is the one shared implementation; every
// adopting page now also wraps its content in the same `mx-auto
// max-w-4xl` (see DESIGN-SYSTEM.md) instead of its own variant.
//
// `actions` (e.g. Analytics' range switcher + CSV export) is optional
// and right-aligned, wrapping under the title on narrow screens —
// `flex flex-wrap items-start justify-between gap-4` is analytics-panel's
// own pre-existing shape, kept exactly rather than reinvented.
//
// `eyebrow` resolves the audit's other header inconsistency: only
// Command Centre and Website Builder rendered one before this pass.
// Decision made here (not dropping it from Website Builder) — every
// adopting page now passes its real nav-section name (Grow/Build/
// Deliver/Account, per `studio-nav.tsx`'s `getNavSections()`) as a
// meaningful eyebrow, reinforcing the sidebar grouping on the page
// itself rather than leaving it as one page's unexplained one-off.
//
// Command Centre (`studio/(authed)/page.tsx`) is deliberately NOT built
// on this — see the comment on its own header for why.
export function StudioPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h1 className="font-heading text-2xl font-semibold md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
