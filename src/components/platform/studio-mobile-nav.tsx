"use client";

import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { StudioNavLink } from "@/components/platform/studio-nav-link";
import { HelpModeToggle } from "@/components/platform/help-mode-toggle";
import { getNavSections } from "@/components/platform/studio-nav";
import { Button } from "@/components/ui/button";

// Same split as the portal's own PortalMobileNav — reads the same nav
// sections the desktop sidebar renders, one definition of the grouping,
// not two. Below md the sidebar is hidden entirely (studio-nav.tsx), so
// this is the only way to navigate Studio on a small screen.
export function StudioMobileNav({ requestsBadgeCount }: { requestsBadgeCount?: number }) {
  const [open, setOpen] = useState(false);
  const navSections = getNavSections();

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
        // Reported live (screenshot): the drawer's nav items sat visibly
        // indented from the true left edge on a narrow viewport instead
        // of running edge-to-edge, eating into the room the whole point
        // of a mobile drawer is meant to free up. Root cause: `absolute`
        // resolves against the nearest positioned ancestor by walking up
        // the DOM, and this button sits nested inside the header's own
        // `mx-auto max-w-6xl px-6` centered content row — several layers
        // below the `<header className="relative">` this was written
        // assuming it'd anchor to. `fixed` sidesteps that ancestor chain
        // entirely and anchors to the real viewport, the same fix
        // already used earlier this session for the left sidebar's own
        // position:sticky getting broken by an unrelated ancestor.
        // top-16 matches this file's own pre-existing max-h
        // calc(100vh-4rem) assumption that the header is exactly 4rem
        // tall — already correct, just never actually applied to `top`
        // itself until now.
        <nav className="fixed inset-x-0 top-16 z-40 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border/60 bg-background px-6 py-4 shadow-sm">
          <div className="flex flex-col gap-4">
            {navSections.map((section, i) => (
              <div key={section.label ?? `ungrouped-${i}`} className="flex flex-col gap-1">
                {section.label && <p className="text-eyebrow px-2.5 pb-1">{section.label}</p>}
                {section.items.map((item) => (
                  <StudioNavLink key={item.href} href={item.href} onClick={() => setOpen(false)} className="w-full">
                    <item.icon className="size-4" />
                    {item.label}
                    {item.href === "/studio/requests" && requestsBadgeCount !== undefined && requestsBadgeCount > 0 && (
                      <span className="ml-auto flex size-4.5 shrink-0 items-center justify-center rounded-full bg-destructive/15 font-mono text-[10px] font-semibold text-destructive">
                        {requestsBadgeCount > 99 ? "99+" : requestsBadgeCount}
                      </span>
                    )}
                  </StudioNavLink>
                ))}
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-3">
              <form action="/api/platform/logout" method="post" onSubmit={() => setOpen(false)}>
                <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </form>
              <HelpModeToggle />
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
