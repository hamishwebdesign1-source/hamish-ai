"use client";

import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { AdminNavLink } from "@/components/admin/nav-link";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import { NAV_SECTIONS } from "@/components/admin/sidebar";
import { Button } from "@/components/ui/button";

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
        <nav className="absolute inset-x-0 top-full z-40 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border/60 bg-background px-6 py-4 shadow-sm">
          <div className="flex flex-col gap-4">
            {NAV_SECTIONS.map((section, i) => (
              <div key={section.label ?? `ungrouped-${i}`} className="flex flex-col gap-1">
                {section.label && <p className="text-eyebrow px-2.5 pb-1">{section.label}</p>}
                {section.items.map((item) => (
                  <AdminNavLink key={item.href} href={item.href} onClick={() => setOpen(false)} className="w-full">
                    <item.icon className="size-4" />
                    {item.label}
                  </AdminNavLink>
                ))}
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-3">
              <form action={signOutAction} onSubmit={() => setOpen(false)}>
                <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </form>
              <ThemeToggle />
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
