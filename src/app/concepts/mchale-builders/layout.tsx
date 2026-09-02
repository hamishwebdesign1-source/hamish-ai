import type { Metadata } from "next";

// SEO/metadata audit (2 Sep 2026) — see blackadder-mcmonagle/layout.tsx
// (the first of these 21) for the full reasoning. No prospects row links
// to this concept_slug (unlike the other 20), so the business name comes
// from the page's own real, visible text instead ("PJ McHale Joiners &
// Builders" — page.tsx's own hero copy).
// description added same pass — see blackadder-mcmonagle/layout.tsx.
export const metadata: Metadata = {
  title: "PJ McHale Joiners & Builders",
  description:
    "A concept website redesign by HamishAI for PJ McHale Joiners & Builders — a real example of what AI-powered redesign could look like.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
