"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { siteConfig } from "@/lib/site-config";
import { usePlatformContext } from "@/lib/use-platform-context";

// SEO/GEO audit (2 Sep 2026) — same fix as site-header.tsx's own
// isPlatformContext (0e8f23a): this footer was still rendering
// siteConfig.nav's 6 consultancy links unconditionally, including on the
// new Platform-first homepage, undermining that header fix — a visitor
// scrolling to the bottom of "/" saw the same six wrong-product links
// the header no longer shows. Converted to a client component (was a
// plain server component) to get pathname, same contextual split — now via
// the shared usePlatformContext() hook so this can't drift from the
// header's own copy the way the original inline duplication just did.
export function SiteFooter() {
  const isPlatformContext = usePlatformContext();
  const navItems = isPlatformContext ? siteConfig.platformNav : siteConfig.nav;

  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>
          <Logo className="text-base" />
          <p className="mt-1">{siteConfig.location}</p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-6">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-1 md:text-right">
          <a href={`mailto:${siteConfig.email}`} className="hover:text-foreground">
            {siteConfig.email}
          </a>
          {/* Deliberately not added to siteConfig.nav (shared with the
              primary header nav) — where a new lead magnet gets promoted
              in the main IA is a content-strategy call, not an engineering
              one, so this stays a modest footer mention until that's
              decided rather than silently claiming a 7th header nav slot. */}
          <Link href="/website-audit" className="text-accent hover:text-accent/80">
            Free website health check →
          </Link>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 border-t border-border/60 px-6 py-4 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>
          © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          {/* Google's own widget — publisher.js (loaded in (site)/layout.tsx)
              replaces this div with the real interactive button once it
              runs; data-theme="light" matches this site's own fixed
              (non-toggleable) light theme rather than defaulting silently. */}
          <div google-add-preferred-source-btn="" data-theme="light" />
        </div>
      </div>
    </footer>
  );
}
