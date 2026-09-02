"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { siteConfig } from "@/lib/site-config";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // null while unknown (first paint, and for every visitor who never
  // touches a /platform page) — same "Sign in" link renders for both
  // null and false, so there's no flash from a wrong guess while this
  // resolves; it only ever changes what's shown by upgrading to true.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 2 Sep 2026 — the Agency Platform marketing page moved from /platform
  // to / (the homepage), and the previous homepage moved to /agency (see
  // (site)/page.tsx's own comment for the full reasoning). This header is
  // shared by both worlds, so "am I on a Platform page" can no longer be
  // a startsWith("/platform") check — that would now miss the homepage
  // itself. Exact-match on "/" (not startsWith, which would wrongly match
  // every route) plus the real /platform/* subroutes (signup, onboarding,
  // callback — untouched, still under src/app/platform/) and /studio.
  const isPlatformContext = pathname === "/" || pathname.startsWith("/platform/") || pathname.startsWith("/studio");

  useEffect(() => {
    if (!isPlatformContext) return;
    // Session check only, not org membership — /studio's own server-side
    // gate already sends a signed-in-but-orgless visitor on to
    // /platform/onboarding correctly, so this doesn't need to duplicate
    // that check just to decide what one header link says.
    getSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => setSignedIn(Boolean(data.user)));
  }, [isPlatformContext]);

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
          {/* Deliberately not in siteConfig.nav, alongside the pages
              that sell Hamish AI's own services — real feedback (a Skool
              reply, 19 Aug 2026) flagged that a local business owner
              couldn't tell if they were the client or the product when
              this sat flush in the main nav. A muted, visually distinct
              text link instead of a matching nav item or button keeps it
              reachable without implying it's another consultancy page. */}
          {isPlatformContext && signedIn ? null : isPlatformContext ? (
            // Contextual, not global — this header is shared with every
            // consultancy page too (About, Services, /agency...), and a
            // "Sign in" link there would confuse a local business owner
            // who isn't an Agency Platform tenant at all, same reasoning
            // as this link's own comment for why "Launch an AI agency"
            // stays muted rather than a full nav item.
            // Only shown once someone's actually on a Platform-related
            // page (now including the homepage itself). Skipped entirely
            // when already signed in — the primary button just to the
            // right already says "Go to Studio", so this would only
            // repeat it.
            <Link
              href="/platform/signup"
              className="hidden text-xs text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground lg:inline"
            >
              Sign in
            </Link>
          ) : (
            <Link
              href="/"
              className="hidden text-xs text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground lg:inline"
            >
              Launch an AI agency →
            </Link>
          )}
          {/* Also contextual, same reasoning as the muted link above —
              with the Platform now the homepage, always showing the
              consultancy's own CTA here would put the wrong primary
              button on the page most people land on first. */}
          {isPlatformContext ? (
            <Button size="sm" className="hidden sm:inline-flex" render={<Link href={signedIn ? "/studio" : "/platform/signup"} />}>
              {signedIn ? "Go to Studio" : "Start free trial"}
            </Button>
          ) : (
            <Button size="sm" className="hidden sm:inline-flex" render={<Link href="/book" />}>
              Book a free AI consultation
            </Button>
          )}
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
            {isPlatformContext ? (
              <Button
                size="sm"
                className="mt-2 w-full"
                render={<Link href={signedIn ? "/studio" : "/platform/signup"} />}
                onClick={() => setOpen(false)}
              >
                {signedIn ? "Go to Studio" : "Start free trial"}
              </Button>
            ) : (
              <Button
                size="sm"
                className="mt-2 w-full"
                render={<Link href="/book" />}
                onClick={() => setOpen(false)}
              >
                Book a free AI consultation
              </Button>
            )}
            {/* Signed in + platform context already has "Go to Studio" as
                the primary button just above — this second link would
                just repeat it, so it's skipped rather than duplicated. */}
            {isPlatformContext && signedIn ? null : isPlatformContext ? (
              <Link
                href="/platform/signup"
                className="text-center text-xs text-muted-foreground underline decoration-border underline-offset-4"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
            ) : (
              <Link
                href="/"
                className="text-center text-xs text-muted-foreground underline decoration-border underline-offset-4"
                onClick={() => setOpen(false)}
              >
                Launch an AI agency →
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
