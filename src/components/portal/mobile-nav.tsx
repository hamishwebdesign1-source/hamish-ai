"use client";

import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { PortalNavLink } from "@/components/portal/nav-link";
import { PortalThemeToggle } from "@/components/portal/theme-toggle";
import { getNavSections } from "@/components/portal/sidebar";
import { Button } from "@/components/ui/button";

// Client portal redesign Phase 1 — reads the same nav sections the
// desktop sidebar renders (sidebar.tsx), same "define the grouping once"
// discipline as the admin's mobile-nav.tsx.
export function PortalMobileNav({ orgName }: { orgName: string }) {
  const [open, setOpen] = useState(false);
  const navSections = getNavSections(orgName);

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
        // Same fix as studio-mobile-nav.tsx's own (2026-09-03) — `absolute`
        // was anchoring to whichever positioned ancestor it lands on by
        // DOM nesting, not the true viewport, so the drawer sat visibly
        // indented instead of running edge-to-edge. `fixed` sidesteps
        // that ancestor chain entirely.
        <nav className="fixed inset-x-0 top-16 z-40 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border/60 bg-background px-6 py-4 shadow-sm">
          <div className="flex flex-col gap-4">
            {navSections.map((section, i) => (
              <div key={section.label ?? `ungrouped-${i}`} className="flex flex-col gap-1">
                {section.label && <p className="text-eyebrow px-2.5 pb-1">{section.label}</p>}
                {section.items.map((item) => (
                  <PortalNavLink key={item.href} href={item.href} onClick={() => setOpen(false)} className="w-full">
                    <item.icon className="size-4" />
                    {item.label}
                  </PortalNavLink>
                ))}
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-3">
              <form action="/api/portal/logout" method="post" onSubmit={() => setOpen(false)}>
                <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </form>
              <PortalThemeToggle />
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
