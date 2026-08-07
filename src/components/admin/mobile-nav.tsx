"use client";

import { useState } from "react";
import { Menu, X, LayoutDashboard, Users, Search, BookOpen, Plug, Workflow, ShieldCheck, History, LogOut } from "lucide-react";
import { AdminNavLink } from "@/components/admin/nav-link";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/leads", label: "Leads", icon: Search },
  { href: "/admin/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/admin/google-setup", label: "Google", icon: Plug },
  { href: "/admin/ms-setup", label: "Microsoft", icon: Plug },
  { href: "/admin/process", label: "Process", icon: Workflow },
  { href: "/admin/audit", label: "Audit", icon: ShieldCheck },
  { href: "/admin/activity-log", label: "Activity", icon: History },
];

export function AdminMobileNav({ signOutAction }: { signOutAction: () => void }) {
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
              <AdminNavLink key={item.href} href={item.href} onClick={() => setOpen(false)}>
                <item.icon className="size-4" />
                {item.label}
              </AdminNavLink>
            ))}
            <form action={signOutAction} onSubmit={() => setOpen(false)}>
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
