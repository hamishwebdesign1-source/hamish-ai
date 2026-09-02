// SEO/GEO audit (2026-09-02) — FAQPage structured data, only ever given
// the exact same {question, answer} pairs already rendered visibly on
// the page (homepage, /services, /platform each pass their own real
// `faqs` array straight through) — never a separate, schema-only set of
// questions invented for search engines. This is precisely the rule the
// audit itself was told to follow: "Do NOT add schema for information
// that isn't actually present." One shared component rather than three
// near-identical inline <script> tags, so the JSON-LD shape can't drift
// from what schema.org's FAQPage type actually expects.
export type FaqEntry = { question: string; answer: string };

export function FaqJsonLd({ faqs }: { faqs: FaqEntry[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  // Static JSON.stringify of our own data, not user input — same
  // dangerouslySetInnerHTML pattern already used elsewhere in this
  // codebase (theme-toggle.tsx), and the standard way Next.js itself
  // documents embedding JSON-LD.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
