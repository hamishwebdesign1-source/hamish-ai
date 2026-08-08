import { LayoutDashboard, Users, BookOpen, Plug, Search, Workflow, ShieldCheck, History } from "lucide-react";
import { AdminNavLink } from "@/components/admin/nav-link";

// Portal redesign Stage 3 — replaces the old single-row top nav (9 items
// flat, no grouping) with a grouped sidebar, matching how the business is
// actually operated rather than a flat page list. Grouping is deliberately
// narrower than the brief's own example structure (no "AI Activity" /
// "Automation" / "Lead detail" entries yet) — those pages don't exist
// until Stage 4/5 build them; a nav entry pointing nowhere is worse than
// no entry. Shared between desktop (sidebar.tsx) and mobile (drawer in
// mobile-nav.tsx) so the grouping only has to be defined once.
export const NAV_SECTIONS: {
  label: string | null;
  items: { href: string; label: string; icon: typeof LayoutDashboard }[];
}[] = [
  { label: null, items: [{ href: "/admin", label: "Command Centre", icon: LayoutDashboard }] },
  { label: "Sales", items: [{ href: "/admin/leads", label: "Leads", icon: Search }] },
  { label: "Clients", items: [{ href: "/admin/clients", label: "Clients", icon: Users }] },
  { label: "Intelligence", items: [{ href: "/admin/audit", label: "Audit", icon: ShieldCheck }] },
  { label: null, items: [{ href: "/admin/knowledge", label: "Knowledge", icon: BookOpen }] },
  { label: "Reference", items: [{ href: "/admin/process", label: "Process", icon: Workflow }] },
  {
    label: "System",
    items: [
      { href: "/admin/google-setup", label: "Google", icon: Plug },
      { href: "/admin/ms-setup", label: "Microsoft", icon: Plug },
      { href: "/admin/activity-log", label: "Activity log", icon: History },
    ],
  },
];

export function AdminSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-6 py-8 md:flex">
      {NAV_SECTIONS.map((section, i) => (
        <div key={section.label ?? `ungrouped-${i}`} className="flex flex-col gap-1">
          {section.label && <p className="text-eyebrow px-2.5 pb-1">{section.label}</p>}
          {section.items.map((item) => (
            <AdminNavLink key={item.href} href={item.href} className="w-full">
              <item.icon className="size-4" />
              {item.label}
            </AdminNavLink>
          ))}
        </div>
      ))}
    </aside>
  );
}
