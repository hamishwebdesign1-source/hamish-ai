"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { siteConfig } from "@/lib/site-config";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur transition-all duration-300 ${
        scrolled
          ? "border-b border-border/60 bg-background/90 shadow-sm shadow-black/[0.02]"
          : "border-b border-transparent bg-background/40"
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label={siteConfig.name} className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {siteConfig.nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group relative py-2 text-sm transition-colors ${
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
                <span
                  className={`absolute inset-x-0 -bottom-0.5 h-px origin-left bg-accent transition-transform duration-300 ease-out ${
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="gradient"
            className="hidden sm:inline-flex"
            render={<Link href="/book" />}
          >
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
        <nav className="animate-in fade-in slide-in-from-top-2 border-t border-border/60 bg-background px-6 py-4 duration-200 md:hidden">
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
              render={<Link href="/book" />}
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
