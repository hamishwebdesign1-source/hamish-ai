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
    // Added 2 Sep 2026, same as website-audit-json-ld.tsx's own fix —
    // every package is a real section on this one real page, not a
    // separate URL each, so all 4 share the same genuine canonical
    // location rather than being left without a url at all.
    url: "https://www.hamishai.org/services",
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
