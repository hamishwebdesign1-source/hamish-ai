import type { Metadata } from "next";
import { DemoBanner } from "@/components/demo-banner";

// SEO audit (2026-09-02) — verified live: all 5 demo sites had no
// meta-robots tag at all, meaning Google's default (index, follow)
// applied. These are fictional portfolio demos with real-sounding
// business names (The Gannet, Craigie & Sons, etc.) — indexing them as
// if they were real, separate businesses is exactly the kind of
// low-value/confusing content Google's helpful-content guidance flags,
// and it dilutes hamishai.org's own topical authority with 5 pages that
// aren't really about HamishAI at all. `follow: true` keeps internal
// links crawlable (no crawl dead-end) — only indexing is turned off.
// Individual demo pages keep their own title/description metadata
// (still shown when a real visitor is sent the link directly); Next.js
// merges a child's metadata object with this layout's per-key, so
// `robots` here isn't overridden by a page that doesn't set its own.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function DemoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex-1">
      <DemoBanner />
      {children}
    </div>
  );
}
