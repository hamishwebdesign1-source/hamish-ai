"use client";

import { useState } from "react";
import { LayoutDashboard, MessagesSquare, Receipt, LineChart, LifeBuoy, LogOut, Menu, X } from "lucide-react";
import { PortalNavLink } from "@/components/portal/nav-link";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/portal", label: "Overview", icon: LayoutDashboard },
  { href: "/portal/requests", label: "Requests", icon: MessagesSquare },
  { href: "/portal/billing", label: "Billing", icon: Receipt },
  { href: "/portal/insights", label: "Insights", icon: LineChart },
  { href: "/portal/help", label: "Help", icon: LifeBuoy },
];

export function PortalMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {open && (
        <nav className="absolute inset-x-0 top-full z-40 border-b border-border/60 bg-background px-6 py-4 shadow-sm">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <PortalNavLink key={item.href} href={item.href} onClick={() => setOpen(false)}>
                <item.icon className="size-4" />
                {item.label}
              </PortalNavLink>
            ))}
            <form action="/api/portal/logout" method="post" onSubmit={() => setOpen(false)}>
              <Button type="submit" variant="ghost" size="sm" className="mt-2 w-full justify-start text-muted-foreground">
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          </div>
        </nav>
      )}
    </div>
  );
}
