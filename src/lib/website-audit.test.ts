import { describe, it, expect } from "vitest";
import { computeAuditScore } from "./website-audit";
import type { SiteCheck } from "./research-lead";

function siteCheck(overrides: Partial<SiteCheck> = {}): SiteCheck {
  return {
    website: "https://example.com",
    resolves: true,
    ssl_ok: true,
    response_ms: 500,
    has_booking_form: true,
    mobile_friendly: true,
    title: "Example",
    meta_description: "An example site",
    redirect_to: null,
    ...overrides,
  };
}

describe("computeAuditScore", () => {
  it("scores an F when the site doesn't load at all, regardless of issue count", () => {
    const result = computeAuditScore(siteCheck({ resolves: false }), 0);
    expect(result).toEqual({ score: 15, grade: "F" });
  });

  it("scores a perfect site as an A with zero AI-found issues", () => {
    const result = computeAuditScore(siteCheck(), 0);
    expect(result.score).toBe(100);
    expect(result.grade).toBe("A");
  });

  it("treats a non-https site (ssl_ok null) as passing, not failing, the SSL check", () => {
    const withNullSsl = computeAuditScore(siteCheck({ ssl_ok: null }), 0);
    const withFailedSsl = computeAuditScore(siteCheck({ ssl_ok: false }), 0);
    expect(withNullSsl.score).toBeGreaterThan(withFailedSsl.score);
  });

  it("costs real points for no mobile viewport, no booking form, and a slow response", () => {
    const result = computeAuditScore(
      siteCheck({ mobile_friendly: false, has_booking_form: false, response_ms: 5000 }),
      0
    );
    // 100 - 20 (mobile) - 15 (form) - 15 (speed) = 50
    expect(result.score).toBe(50);
    expect(result.grade).toBe("C");
  });

  it("reduces the issue-count points but never below zero for that component", () => {
    // Base (ssl+mobile+form+speed+title/meta) = 85. issue points = 15 - n*3.
    const fewIssues = computeAuditScore(siteCheck(), 2); // 85 + (15-6) = 94
    const manyIssues = computeAuditScore(siteCheck(), 10); // 85 + max(0, 15-30) = 85
    expect(fewIssues.score).toBe(94);
    expect(manyIssues.score).toBe(85);
  });

  it("maps scores to grade bands correctly at the boundaries", () => {
    expect(computeAuditScore(siteCheck(), 0).grade).toBe("A"); // 100
    // base without mobile+form = 20(ssl)+15(speed)+15(title/meta) = 50, + 15 issue points = 65
    expect(computeAuditScore(siteCheck({ has_booking_form: false, mobile_friendly: false }), 0).grade).toBe("C");
  });

  it("never returns a score outside 0-100", () => {
    const worst = computeAuditScore(
      siteCheck({ ssl_ok: false, mobile_friendly: false, has_booking_form: false, response_ms: 9000, title: null, meta_description: null }),
      50
    );
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(worst.score).toBeLessThanOrEqual(100);
  });
});
