import Link from "next/link";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

// The filter-chip-as-tabs pattern was hand-rolled repeatedly across the
// internal admin (Overview, Clients, Leads, Audit) as Badge + Link with
// slightly different active-state logic each time — one component
// instead. Originally lived under components/admin/ despite having no
// admin-specific coupling; moved here (client portal redesign Phase 4) so
// the portal's Requests page can reuse it too instead of hand-rolling its
// own fifth copy of the same pattern. The caller still owns building each
// option's href (filterHref() etc. already handle preserving the other
// active filter dimensions), this just owns the rendering and the
// active-state comparison.
//
// Rendered as ghost text pills rather than individually-bordered badges
// (the original look, kept until this pass): a full outline on every
// single option — active and inactive alike — reads as visual noise once
// a page stacks more than one filter row (Leads runs four independent
// dimensions plus a sort row). Only the active option gets a filled
// pill now; everything else recedes to plain text until hovered, so a
// six-option row reads as "one choice, some other options" instead of
// "six equally-weighted boxes."
export type FilterTabOption = {
  key: string | undefined; // undefined = the "clear this filter" / "All" option
  label: string;
  count?: number;
  href: string;
  icon?: ComponentType<{ className?: string }>;
};

export function FilterTabs({
  label,
  options,
  activeKey,
}: {
  label?: string;
  options: FilterTabOption[];
  activeKey: string | undefined;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
      {label && (
        <span className="mr-1 inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
      )}
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = activeKey === opt.key;
        return (
          <Link
            key={opt.key ?? "__all__"}
            href={opt.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {Icon && <Icon className="size-3" />}
            {opt.label}
            {opt.count !== undefined && (
              <span className={cn("tabular-nums", isActive ? "text-secondary-foreground/60" : "text-muted-foreground/60")}>
                {opt.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
