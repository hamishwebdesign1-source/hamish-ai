// SEO/GEO audit (2 Sep 2026) — Service schema for the free website health
// check, a real, distinct, functioning tool (WebsiteAuditForm) — not just
// marketing copy. `price: "0"` is a genuine fact (the page's own real
// trust points already say "Free, no obligation"), not a placeholder.
export function WebsiteAuditJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Free Website Health Check",
    description:
      "Real technical checks (SSL, mobile-friendliness, load speed) plus a plain-English AI review of what's working, what isn't, and where AI could specifically help.",
    provider: { "@type": "Organization", name: "HamishAI" },
    areaServed: { "@type": "City", name: "Edinburgh" },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GBP",
    },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
