import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getPlatformPlan, formatMonthlyPrice, platformPlans, planSlugForPriceId, type PlatformPlanSlug } from "./platform-plans";

describe("getPlatformPlan", () => {
  it("returns the matching plan for each real slug", () => {
    for (const plan of platformPlans) {
      expect(getPlatformPlan(plan.slug)).toBe(plan);
    }
  });

  // The exact throw a real tenant's Billing page hit this session when
  // org.plan held a stale/unrecognised slug — billing/page.tsx now
  // guards against it with platformPlans.some(...) before calling this,
  // but the throw itself is the contract callers must keep guarding
  // against, so it's pinned here rather than silently changing shape.
  it("throws on an unrecognised plan slug rather than returning undefined", () => {
    expect(() => getPlatformPlan("enterprise" as PlatformPlanSlug)).toThrow(/Unknown platform plan/);
  });
});

describe("formatMonthlyPrice", () => {
  it("formats whole-pound amounts with no decimals", () => {
    expect(formatMonthlyPrice(1900)).toBe("£19");
    expect(formatMonthlyPrice(4900)).toBe("£49");
    expect(formatMonthlyPrice(9900)).toBe("£99");
  });
});

describe("platformPlans catalog", () => {
  it("has exactly the three documented tiers, cheapest to most expensive", () => {
    expect(platformPlans.map((p) => p.slug)).toEqual(["starter", "professional", "agency"]);
    expect(platformPlans[0].monthlyPence).toBeLessThan(platformPlans[1].monthlyPence);
    expect(platformPlans[1].monthlyPence).toBeLessThan(platformPlans[2].monthlyPence);
  });

  it("gives every higher tier strictly more prospects per month than the one below it", () => {
    expect(platformPlans[0].prospectsPerMonth).toBeLessThan(platformPlans[1].prospectsPerMonth);
    expect(platformPlans[1].prospectsPerMonth).toBeLessThan(platformPlans[2].prospectsPerMonth);
  });
});

const ENV_VARS = {
  starter: "STRIPE_PRICE_PLATFORM_STARTER",
  professional: "STRIPE_PRICE_PLATFORM_PROFESSIONAL",
  agency: "STRIPE_PRICE_PLATFORM_AGENCY",
};

const originalEnv = { ...process.env };

// Billing-bug fix (2026-09-01) — this is the exact lookup the Stripe
// webhook's own customer.subscription.updated handler now depends on to
// keep organisations.plan truthful after any subscription change, so a
// wrong answer here is a wrong plan recorded for a real paying org.
describe("planSlugForPriceId", () => {
  beforeEach(() => {
    process.env[ENV_VARS.starter] = "price_starter_123";
    process.env[ENV_VARS.professional] = "price_pro_456";
    process.env[ENV_VARS.agency] = "price_agency_789";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("resolves a real configured price id back to its plan slug", () => {
    expect(planSlugForPriceId("price_starter_123")).toBe("starter");
    expect(planSlugForPriceId("price_pro_456")).toBe("professional");
    expect(planSlugForPriceId("price_agency_789")).toBe("agency");
  });

  it("returns null for a price id that doesn't match any configured plan", () => {
    expect(planSlugForPriceId("price_unknown_000")).toBeNull();
  });

  it("returns null when the matching env var isn't set at all", () => {
    delete process.env[ENV_VARS.agency];
    expect(planSlugForPriceId("price_agency_789")).toBeNull();
  });
});
