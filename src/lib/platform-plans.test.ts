import { describe, it, expect } from "vitest";
import { getPlatformPlan, formatMonthlyPrice, platformPlans, type PlatformPlanSlug } from "./platform-plans";

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
