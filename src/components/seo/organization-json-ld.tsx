import { siteConfig } from "@/lib/site-config";

// SEO/GEO audit (2026-09-02) — sitewide Organization + WebSite entity
// markup (Phase 7: "Audit whether search engines and AI systems can
// understand HamishAI as an entity"). Rendered once, in the root layout,
// so it applies to every page rather than being duplicated per-route —
// the standard pattern for sitewide publisher markup.
//
// Every field here is sourced from siteConfig.ts (the site's own single
// source of truth for these facts, already used by the real /contact
// page, sales-kit drafts, and outreach emails) or a genuinely live,
// served asset (icon.svg) — nothing invented for the sake of filling out
// the schema. No `address` field: siteConfig only ever states a general
// location ("Edinburgh, Scotland"), not a real street address, and
// fabricating a precise PostalAddress this codebase doesn't actually
// have would be exactly the kind of schema-for-schema's-sake the audit
// was told not to do. No `aggregateRating`/`review` — no real reviews
// exist anywhere in this codebase to cite.
export function OrganizationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://hamishai.org/#organization",
        name: siteConfig.name,
        alternateName: "HamishAI",
        url: "https://hamishai.org",
        logo: "https://hamishai.org/icon.svg",
        description: siteConfig.description,
        email: siteConfig.email,
        areaServed: {
          "@type": "City",
          name: "Edinburgh",
        },
        sameAs: [siteConfig.linkedin],
        founder: {
          "@type": "Person",
          name: "Hamish McFarlane",
          jobTitle: "Founder",
          sameAs: [siteConfig.linkedin],
        },
      },
      {
        "@type": "WebSite",
        "@id": "https://hamishai.org/#website",
        url: "https://hamishai.org",
        name: siteConfig.name,
        publisher: { "@id": "https://hamishai.org/#organization" },
        // Matches the root layout's own <html lang="en-GB"> (fixed in
        // the same audit pass) and (site)/layout.tsx's og:locale
        // (en_GB) — all three now agree, where this used to be the one
        // place still saying the more generic "en".
        inLanguage: "en-GB",
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
