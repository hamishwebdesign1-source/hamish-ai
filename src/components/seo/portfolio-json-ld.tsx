import { caseStudies } from "@/lib/case-studies-data";

// SEO/GEO audit (2026-09-02) — ItemList schema for /portfolio's real 5
// case studies, live from case-studies-data.ts (the same array driving
// the visible cards). Each item links to its own real /portfolio/[slug]
// page, which already carries its own title/description/canonical and
// BreadcrumbList — this just makes the list itself (which case studies
// exist, in what order) machine-readable too.
export function PortfolioJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: caseStudies.map((study, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: study.name,
      url: `https://hamishai.org/portfolio/${study.slug}`,
    })),
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
