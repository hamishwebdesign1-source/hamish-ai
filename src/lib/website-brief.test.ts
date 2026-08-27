import { describe, it, expect } from "vitest";
import { stripBrief, isWellFormed } from "./website-brief";

describe("stripBrief", () => {
  it("passes through a well-formed tool-call response field for field", () => {
    const raw = {
      businessOverview: "A cafe in Leith.",
      targetAudience: "Locals and commuters.",
      objectives: ["Generate leads"],
      sitemap: [{ page: "Home", purpose: "Introduce the cafe." }],
      contentRequirements: ["Menu photos", "Opening hours"],
      brandGuidelines: "Warm and earthy.",
      designDirection: "Warm, textured, photo-led.",
      ctaStrategy: "Book a table.",
      seoRequirements: ["Local SEO", "Meta descriptions"],
      analyticsRequirements: ["Track bookings"],
      technicalRequirements: ["Responsive", "Fast-loading"],
      acceptanceCriteria: ["Loads with no errors", "Booking form works", "Mobile-friendly"],
    };
    expect(stripBrief(raw)).toEqual(raw);
  });

  // Live-tested finding this file's own header documents: a field can come
  // back as a bare string instead of an array. Must be coerced into a
  // real single-item array, never dropped.
  it("coerces a bare string into a single-item array for an array field", () => {
    const brief = stripBrief({ objectives: "Generate leads" });
    expect(brief.objectives).toEqual(["Generate leads"]);
  });

  it("drops non-string entries out of an array field rather than crashing", () => {
    const brief = stripBrief({ contentRequirements: ["Real item", 42, null, "Another real item"] });
    expect(brief.contentRequirements).toEqual(["Real item", "Another real item"]);
  });

  it("defaults every field to empty when given completely garbage input", () => {
    expect(stripBrief("not an object")).toEqual({
      businessOverview: "",
      targetAudience: "",
      objectives: [],
      sitemap: [],
      contentRequirements: [],
      brandGuidelines: "",
      designDirection: "",
      ctaStrategy: "",
      seoRequirements: [],
      analyticsRequirements: [],
      technicalRequirements: [],
      acceptanceCriteria: [],
    });
  });

  it("drops a sitemap entry with no page name, but keeps one with an empty purpose", () => {
    const brief = stripBrief({ sitemap: [{ page: "Home", purpose: "" }, { purpose: "No page name" }, { page: "About", purpose: "About us" }] });
    expect(brief.sitemap).toEqual([{ page: "Home", purpose: "" }, { page: "About", purpose: "About us" }]);
  });

  it("filters out non-object entries in the sitemap array", () => {
    const brief = stripBrief({ sitemap: [null, "garbage", { page: "Home", purpose: "Intro" }] });
    expect(brief.sitemap).toEqual([{ page: "Home", purpose: "Intro" }]);
  });
});

describe("isWellFormed", () => {
  function wellFormedBrief() {
    return stripBrief({
      businessOverview: "A cafe in Leith.",
      objectives: ["Generate leads"],
      sitemap: [{ page: "Home", purpose: "x" }, { page: "About", purpose: "y" }],
      contentRequirements: ["a", "b"],
      seoRequirements: ["a", "b"],
      technicalRequirements: ["a", "b"],
      acceptanceCriteria: ["a", "b", "c"],
    });
  }

  it("is true when every minimum threshold is met", () => {
    expect(isWellFormed(wellFormedBrief())).toBe(true);
  });

  it("is false when businessOverview is empty", () => {
    expect(isWellFormed(stripBrief({ ...wellFormedBrief(), businessOverview: "" }))).toBe(false);
  });

  it("is false when sitemap has fewer than 2 pages", () => {
    const brief = wellFormedBrief();
    expect(isWellFormed({ ...brief, sitemap: [{ page: "Home", purpose: "x" }] })).toBe(false);
  });

  it("is false when acceptanceCriteria has fewer than 3 items", () => {
    const brief = wellFormedBrief();
    expect(isWellFormed({ ...brief, acceptanceCriteria: ["a", "b"] })).toBe(false);
  });
});
