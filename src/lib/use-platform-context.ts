"use client";

import { usePathname } from "next/navigation";

// Extracted 2 Sep 2026 after this exact check was independently
// duplicated in site-header.tsx and then site-footer.tsx (found live —
// the footer still showed the consultancy's 6 nav links on the new
// Platform-first homepage after the header's own copy of this logic was
// already fixed, since nothing kept the two in sync). One shared hook so
// a third component reaching for "am I on a Platform page" can't drift
// from the other two.
//
// SiteHeader only ever actually renders on Platform-context pages at "/"
// itself in practice — /platform/signup and /platform/onboarding are
// deliberately chromeless (no header/footer at all), and /studio has its
// own entirely separate layout — but the check still covers all three
// paths honestly, in case that ever changes.
export function usePlatformContext(): boolean {
  const pathname = usePathname();
  return pathname === "/" || pathname.startsWith("/platform/") || pathname.startsWith("/studio");
}
