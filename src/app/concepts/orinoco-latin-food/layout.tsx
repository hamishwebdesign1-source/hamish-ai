import type { Metadata } from "next";

// SEO/metadata audit (2 Sep 2026) — see blackadder-mcmonagle/layout.tsx
// (the first of these 21) for the full reasoning. Business name from
// the real prospects row (concept_slug = "orinoco-latin-food").
// description added same pass — see blackadder-mcmonagle/layout.tsx.
export const metadata: Metadata = {
  title: "Orinoco Latin Food",
  description:
    "A concept website redesign by HamishAI for Orinoco Latin Food — a real example of what AI-powered redesign could look like.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
