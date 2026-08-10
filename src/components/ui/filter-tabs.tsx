import Link from "next/link";
import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";

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
    <div className="flex flex-wrap items-center gap-2">
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = activeKey === opt.key;
        return (
          <Link key={opt.key ?? "__all__"} href={opt.href}>
            <Badge variant={isActive ? "default" : "outline"} className="gap-1">
              {Icon && <Icon className="size-3" />}
              {opt.label}
              {opt.count !== undefined && ` (${opt.count})`}
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}
