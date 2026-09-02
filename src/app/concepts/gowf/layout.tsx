import type { Metadata } from "next";

// SEO/metadata audit (2 Sep 2026) — see blackadder-mcmonagle/layout.tsx
// (the first of these 21) for the full reasoning. Unlike the other 20,
// this one prospects row explicitly says it's a fictional test project
// ("Gowf (Lily Golf test project)", not a real geographic lead) — title
// kept to the plain name actually shown on the page itself, not the
// database's own bracketed internal note.
export const metadata: Metadata = { title: "Gowf" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
