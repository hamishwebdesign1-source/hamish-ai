"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Users, CreditCard, Mail, Inbox, FolderKanban, HelpCircle, BookOpen, BarChart3 } from "lucide-react";

// The gap this fixes: every /studio/(authed) page had a header with just
// the org name and a sign-out button — the only way from, say, Prospects
// to Billing was clicking back to /studio's own tile grid first. A real
// dashboard doesn't make you go home to change section. This is a
// client component (usePathname for the active-state) rendered from the
// layout's own server component, same split as site-header.tsx's own
// active-link logic.
const items = [
  { href: "/studio", label: "Command Centre", icon: LayoutDashboard },
  { href: "/studio/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/studio/prospects", label: "Prospects", icon: Search },
  { href: "/studio/clients", label: "Clients", icon: Users },
  { href: "/studio/requests", label: "Requests", icon: Inbox },
  { href: "/studio/projects", label: "Projects", icon: FolderKanban },
  { href: "/studio/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/studio/billing", label: "Billing", icon: CreditCard },
  { href: "/studio/settings", label: "Settings", icon: Mail },
  { href: "/studio/help", label: "Help", icon: HelpCircle },
];

export function StudioNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border/60 bg-background">
      <div className="mx-auto flex max-w-6xl items-center gap-6 overflow-x-auto px-6">
        {items.map((item) => {
          const active = item.href === "/studio" ? pathname === "/studio" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 py-3 text-sm font-medium transition-colors ${
                active
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
