import type { Metadata } from "next";

// SEO/metadata audit (2 Sep 2026) — see blackadder-mcmonagle/layout.tsx
// (the first of these 21) for the full reasoning. No prospects row links
// to this concept_slug, so the business name comes from the page's own
// real, visible text instead ("Offshore Coffee" — page.tsx's own hero
// copy and section heading).
// description added same pass — see blackadder-mcmonagle/layout.tsx.
export const metadata: Metadata = {
  title: "Offshore Coffee",
  description:
    "A concept website redesign by HamishAI for Offshore Coffee — a real example of what AI-powered redesign could look like.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
