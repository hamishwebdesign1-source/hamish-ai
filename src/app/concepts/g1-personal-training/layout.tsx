import type { Metadata } from "next";

// SEO/metadata audit (2 Sep 2026) — see blackadder-mcmonagle/layout.tsx
// (the first of these 21) for the full reasoning. Business name from
// the real prospects row (concept_slug = "g1-personal-training").
export const metadata: Metadata = { title: "G1 Personal Training" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
