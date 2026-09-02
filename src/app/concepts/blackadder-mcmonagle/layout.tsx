import type { Metadata } from "next";

// SEO/metadata audit (2 Sep 2026) — verified live: this concept page's
// browser tab showed the root layout's own default title ("HamishAI
// Agency Platform — Launch Your Own AI Agency") instead of anything
// naming this business, because the page itself is a client component
// ("use client") and can't export `metadata` directly — Next.js only
// reads that export from server components. This is a real, if small,
// credibility gap: these pages exist specifically so a cold-outreach
// email can point a real prospect to something that looks like their
// own business's site (concepts/layout.tsx's own comment), and the
// browser tab undercutting that with HamishAI's own name works against
// the page's whole purpose. Fixed the only way possible without
// converting the page itself to a server component: a lightweight
// per-folder layout, wrapping children unchanged, whose only job is
// providing this one real title. Business name from the real prospects
// row (concept_slug = "blackadder-mcmonagle"), not guessed from the URL slug.
// description added same pass, same root cause as title: every page
// also inherited the root layout's own Platform-focused description
// ("The platform behind HamishAI...") instead of anything naming this
// business. Wording matches real, already-visible copy several of these
// pages already show ("Concept by Hamish AI for {Business}"), not
// invented from scratch.
export const metadata: Metadata = {
  title: "Blackadder & McMonagle",
  description:
    "A concept website redesign by HamishAI for Blackadder & McMonagle — a real example of what AI-powered redesign could look like.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
