import { platformPlans } from "@/lib/platform-plans";

// SEO/GEO audit (2026-09-02) — Product + Offer schema for the Agency
// Platform, /platform's own real, live pricing tiers (platform-plans.ts —
// the exact same data driving the visible pricing cards, so this can
// never drift into a separate, stale copy of the prices). Deliberately
// `Product`, not `SoftwareApplication`: this codebase has no verifiable
// install count/rating/OS requirement to honestly fill in the fields
// SoftwareApplication schema expects, and Product + AggregateOffer is
// the more defensible type for a subscription SaaS priced in real
// pounds — no `aggregateRating`/`review`, since no real reviews exist
// anywhere in this codebase to cite (the audit's own rule: don't add
// schema for information that isn't actually present).
export function PlatformProductJsonLd() {
  const prices = platformPlans.map((p) => p.monthlyPence / 100);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "HamishAI Agency Platform",
    description:
      "Infrastructure to build, sell, deliver and grow an AI service business — AI-powered prospect research, sales-kit generation, a branded client portal, and delivery tracking, under your own agency brand.",
    brand: {
      "@type": "Organization",
      name: "HamishAI",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "GBP",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: platformPlans.length,
      offers: platformPlans.map((plan) => ({
        "@type": "Offer",
        name: `${plan.name} plan`,
        price: plan.monthlyPence / 100,
        priceCurrency: "GBP",
        description: plan.tagline,
        // Was "https://hamishai.org/platform" — verified live and in
        // source (next.config.ts) that /platform 301-redirects to "/"
        // as of the homepage swap, so every Offer here pointed structured
        // data through a redirect instead of straight at the canonical
        // destination. Points at the real pricing section's own anchor
        // instead (siteConfig.platformNav's "Pricing" link uses the same
        // "/#pricing" — this isn't a new URL, just reusing the one
        // that's already real). www, not the apex, per the same
        // apex-redirects-to-www fix applied sitewide this same pass.
        url: "https://www.hamishai.org/#pricing",
      })),
    },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
