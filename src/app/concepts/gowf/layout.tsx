import type { Metadata } from "next";

// SEO/metadata audit (2 Sep 2026) — see blackadder-mcmonagle/layout.tsx
// (the first of these 21) for the full reasoning. Unlike the other 20,
// this one prospects row explicitly says it's a fictional test project
// ("Gowf (Lily Golf test project)", not a real geographic lead) — title
// kept to the plain name actually shown on the page itself, not the
// database's own bracketed internal note.
// description added same pass — see blackadder-mcmonagle/layout.tsx.
// Wording here matches this page's own real self-description ("A
// HamishAI test project — a fictional brand concept..."), not the
// "concept for a real business" phrasing used on the other 20, since
// this one genuinely is a fictional test project, not a real prospect.
export const metadata: Metadata = {
  title: "Gowf",
  description:
    "A HamishAI test project — a fictional women's golf apparel brand concept, built to demonstrate the platform end-to-end.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
