import type { MetadataRoute } from "next";
import { caseStudies } from "@/lib/case-studies-data";

// SEO audit (2026-09-02) — verified live and in source: hamishai.org had
// no sitemap.xml at all (/sitemap.xml 404'd on the real domain). Only
// genuinely indexable marketing/portfolio pages are listed — /demo/* and
// /concepts/* are deliberately excluded (noindexed via their own
// layout.tsx, see robots.ts's comment on why that's the right tool, not
// disallow), and every /studio, /admin, /portal, /api route is excluded
// as non-public.
//
// No lastModified dates: this app doesn't track a real per-page "last
// edited" timestamp anywhere (no CMS, no DB row backing these static
// pages), and fabricating one would be a real claim to a date this
// codebase can't actually back up — omitted rather than guessed.
export default function sitemap(): MetadataRoute.Sitemap {
  // www, not the apex — same fix as layout.tsx's own metadataBase (2 Sep
  // 2026): the apex 308-redirects to www at the hosting layer, so every
  // sitemap entry was sending crawlers through a redirect hop instead of
  // straight to the page that actually returns 200.
  const base = "https://www.hamishai.org";

  // Updated 2 Sep 2026 — the Agency Platform moved from /platform to /
  // (the homepage); /platform now 301-redirects here (next.config.ts),
  // so it's dropped from this list rather than listed as a second URL
  // for the same content. The archived former homepage lives at /agency
  // now, still real and indexable, just no longer priority 1.
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/agency`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/services`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/ai-solutions`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/analytics`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/portfolio`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/website-audit`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/book`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.1 },
  ];

  const portfolioPages: MetadataRoute.Sitemap = caseStudies.map((c) => ({
    url: `${base}/portfolio/${c.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...portfolioPages];
}
