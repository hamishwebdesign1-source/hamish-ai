import type { Metadata } from "next";

// SEO/metadata audit (2 Sep 2026) — see blackadder-mcmonagle/layout.tsx
// (the first of these 21) for the full reasoning. Business name from
// the real prospects row (concept_slug = "honeywest-salon" — note a
// second, unrelated "Conversion Flow Test (delete me)" row also shares
// this same concept_slug; the real business name is the genuine one).
export const metadata: Metadata = { title: "Honeywest Hair & Beauty Salon" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
