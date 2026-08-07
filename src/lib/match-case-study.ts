import { caseStudies } from "@/lib/case-studies-data";

// Matches a lead's category to the closest live demo/case study, so
// outreach copy can point to one concrete, industry-matched proof point
// instead of describing capabilities in the abstract. Keyword-based and
// deliberately conservative — no match (salons, generic retailers, estate
// agents) is better than forcing an irrelevant one.
//
// Originally lived inside draft-lead-email.ts; pulled out so
// draft-sales-kit.ts (which superseded that file — see High Impact #8 in
// docs/leads-automation-plan.md) can reuse the exact same matching logic
// instead of re-deriving it — one list of category keywords, not two that
// can drift apart.
const CATEGORY_MATCHES: { keywords: string[]; slug: string }[] = [
  { keywords: ["restaurant", "cafe", "café", "bar", "bistro", "fish"], slug: "the-gannet" },
  { keywords: ["trade", "electric", "plumb", "joiner", "joinery"], slug: "craigie-and-sons" },
  { keywords: ["hotel", "b&b", "bnb", "guest house"], slug: "assembly-rooms-hotel" },
  { keywords: ["gym", "fitness", "training"], slug: "forge-fitness" },
  { keywords: ["account", "solicitor", "estate agent", "professional service"], slug: "lomond-and-grey" },
];

export function matchCaseStudy(category: string | null) {
  if (!category) return undefined;
  const lower = category.toLowerCase();
  const match = CATEGORY_MATCHES.find((m) => m.keywords.some((k) => lower.includes(k)));
  if (!match) return undefined;
  return caseStudies.find((c) => c.slug === match.slug);
}
