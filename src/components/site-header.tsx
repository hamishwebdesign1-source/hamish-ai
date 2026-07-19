"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { siteConfig } from "@/lib/site-config";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label={siteConfig.name}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {siteConfig.nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "text-sm font-medium text-foreground"
                    : "text-sm text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="gradient" className="hidden sm:inline-flex" render={<Link href="/contact" />}>
            Book a free AI consultation
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border/60 bg-background px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-foreground"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Button
              size="sm"
              variant="gradient"
              className="mt-2 w-full"
              render={<Link href="/contact" />}
              onClick={() => setOpen(false)}
            >
              Book a free AI consultation
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
