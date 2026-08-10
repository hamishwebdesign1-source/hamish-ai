import { LayoutDashboard, Sparkles, MessagesSquare, LineChart, Receipt, LifeBuoy, Settings } from "lucide-react";
import { PortalNavLink } from "@/components/portal/nav-link";

// Client portal redesign Phase 1 — replaces the old single-row flat top
// nav (6 items, no grouping) with a grouped sidebar, same pattern as the
// internal admin's Stage 3 (src/components/admin/sidebar.tsx). Deliberately
// lighter grouping than the admin's — this portal is meant to be
// significantly simpler, not a smaller copy of the same density.
// "Ask HamishAI" joined in Phase 3 once /portal/ask existed — same
// discipline the admin sidebar followed: no nav entry for a page that
// isn't built yet.
export const NAV_SECTIONS: {
  label: string | null;
  items: { href: string; label: string; icon: typeof LayoutDashboard }[];
}[] = [
  {
    label: null,
    items: [
      { href: "/portal", label: "Home", icon: LayoutDashboard },
      { href: "/portal/ask", label: "Ask HamishAI", icon: Sparkles },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/portal/requests", label: "Requests", icon: MessagesSquare },
      { href: "/portal/insights", label: "Insights", icon: LineChart },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/portal/billing", label: "Billing", icon: Receipt },
      { href: "/portal/help", label: "Help", icon: LifeBuoy },
      { href: "/portal/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function PortalSidebar() {
  return (
    <aside className="hidden w-52 shrink-0 flex-col gap-6 py-8 md:flex">
      {NAV_SECTIONS.map((section, i) => (
        <div key={section.label ?? `ungrouped-${i}`} className="flex flex-col gap-1">
          {section.label && <p className="text-eyebrow px-2.5 pb-1">{section.label}</p>}
          {section.items.map((item) => (
            <PortalNavLink key={item.href} href={item.href} className="w-full">
              <item.icon className="size-4" />
              {item.label}
            </PortalNavLink>
          ))}
        </div>
      ))}
    </aside>
  );
}
