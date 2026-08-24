// The Agency Platform's pricing catalog — the single source of truth for
// plan names, limits and Stripe wiring. Same "content lives in a data
// file, not JSX" convention as packages/analyticsPackage in site-config.ts,
// deliberately kept in its own file rather than added to that one: these
// are Agency Platform SaaS prices, not HamishAI's own client packages, and
// the two must never get edited as if they were the same list (see the
// HamishAI Agency Platform architecture doc's "two products" distinction).
//
// Three tiers only, per that doc's pricing recommendation — no free
// self-serve tier and no standalone White Label tier yet. White-label is a
// future add-on on top of Agency once actually requested, not a fourth
// row here.
export type PlatformPlanSlug = "starter" | "professional" | "agency";

export type PlatformPlan = {
  slug: PlatformPlanSlug;
  name: string;
  monthlyPence: number;
  tagline: string;
  prospectsPerMonth: number;
  agencyTypeTemplates: string;
  seats: number | "multiple";
  features: string[];
  highlighted?: boolean;
  // The Stripe Price id for this plan lives in an env var, not hardcoded
  // here — created once by scripts/setup-platform-stripe.ts, which prints
  // the exact env var name each Price should be pasted into. Keeping the
  // id out of source means rotating a price later never needs a code
  // change, only an env var update.
  stripePriceEnvVar: string;
};

export const platformPlans: PlatformPlan[] = [
  {
    slug: "starter",
    name: "Starter",
    monthlyPence: 5900,
    tagline: "Prove the model in your own niche before scaling it up.",
    prospectsPerMonth: 30,
    agencyTypeTemplates: "1",
    seats: 1,
    features: [
      "Up to 30 researched prospects a month",
      "AI sales-kit generation (email, call script, LinkedIn message)",
      "1 agency type template",
      "HamishAI-branded client portal",
    ],
    stripePriceEnvVar: "STRIPE_PRICE_PLATFORM_STARTER",
  },
  {
    slug: "professional",
    name: "Professional",
    monthlyPence: 11900,
    tagline: "The full loop — prospecting through client delivery.",
    prospectsPerMonth: 100,
    agencyTypeTemplates: "2 to 3",
    seats: 1,
    features: [
      "Up to 100 researched prospects a month",
      "Unlimited managed clients",
      "2 to 3 agency type templates",
      "Your own logo and accent colour on the client portal",
    ],
    highlighted: true,
    stripePriceEnvVar: "STRIPE_PRICE_PLATFORM_PROFESSIONAL",
  },
  {
    slug: "agency",
    name: "Agency",
    monthlyPence: 22900,
    tagline: "Higher volume, more seats, priority research.",
    prospectsPerMonth: 250,
    agencyTypeTemplates: "All",
    seats: "multiple",
    features: [
      "Up to 250 researched prospects a month",
      "Multiple team seats",
      "Priority research queue",
      "White-label add-on available once requested",
    ],
    stripePriceEnvVar: "STRIPE_PRICE_PLATFORM_AGENCY",
  },
];

export function getPlatformPlan(slug: PlatformPlanSlug): PlatformPlan {
  const plan = platformPlans.find((p) => p.slug === slug);
  if (!plan) throw new Error(`Unknown platform plan: ${slug}`);
  return plan;
}

export function formatMonthlyPrice(pence: number): string {
  return `£${(pence / 100).toFixed(0)}`;
}

// A single top-up pack, deliberately priced well under the cheapest
// plan's own per-prospect rate (Starter: £59/30 = ~£1.97 each; this is
// 45p each) — an enticing "just get me over the hump" purchase, not a
// second pricing ladder. One-time Stripe Price (mode: "payment"), not a
// recurring one, set up the same way as the three plans above (Product
// id `hamishai-platform-credit-pack`, price id from the env var below —
// see scripts/setup-platform-stripe.ts).
export const PROSPECT_CREDIT_PACK = {
  productId: "hamishai-platform-credit-pack",
  prospects: 20,
  pricePence: 900,
  stripePriceEnvVar: "STRIPE_PRICE_PLATFORM_CREDIT_PACK",
};
