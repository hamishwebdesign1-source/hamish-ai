import { siteConfig } from "@/lib/site-config";

// SEO/GEO audit (2026-09-02) — Person schema for /about, only claims
// facts that page's own real, visible copy already states: 11 years as
// a business analyst in financial services (NatWest Group), founder of
// HamishAI. No alumniOf/worksFor employer name beyond what's actually
// named on the page, no invented awards or credentials.
export function PersonJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Hamish McFarlane",
    jobTitle: "Founder, HamishAI",
    description:
      "Technology Business Analyst with 11 years' experience in financial services (NatWest Group), now building AI-powered delivery for small businesses and the HamishAI Agency Platform.",
    url: "https://hamishai.org/about",
    sameAs: [siteConfig.linkedin],
    worksFor: {
      "@type": "Organization",
      name: "HamishAI",
      url: "https://hamishai.org",
    },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
