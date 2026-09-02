import { packages, analyticsPackage, type Package } from "@/lib/site-config";

// SEO/GEO audit (2026-09-02) — Service schema for /services' own real
// packages (site-config.ts), the same array driving the visible pricing
// cards. No numeric Offer.price: foundingPrice/standardPrice are real
// strings like "£1,500 – £3,000 standard price" (a range, and a
// time-limited founding rate on top), and parsing that into a strict
// numeric schema.org price risks silently producing a wrong number if
// the copy's wording ever changes — the honest choice is a text
// description carrying the exact same real pricing string already
// shown on the page, not a fragile-and-possibly-wrong parsed value.
function packageToService(pkg: Package) {
  return {
    "@type": "Service",
    name: pkg.name,
    description: pkg.tagline,
    provider: { "@type": "Organization", name: "HamishAI" },
    areaServed: { "@type": "City", name: "Edinburgh" },
    offers: {
      "@type": "Offer",
      priceCurrency: "GBP",
      description: `${pkg.foundingPrice} (founding client rate) — ${pkg.standardPrice}`,
    },
  };
}

export function ServicesJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [...packages, analyticsPackage].map((pkg, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: packageToService(pkg),
    })),
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
