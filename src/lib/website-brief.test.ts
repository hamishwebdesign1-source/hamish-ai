import { describe, it, expect } from "vitest";
import { stripBrief, isWellFormed, buildWizardPrefill, prospectHasPrefillSource, type PrefillProspect } from "./website-brief";
import type { LeadResearch } from "./research-lead";
import type { WebsiteMockup } from "./draft-website-mockup";

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

// Prospects → Website Builder prefill (BACKLOG.md, 2026-09-03) — pure
// logic, unit-tested directly per the backlog's own acceptance criteria,
// same pattern as stripBrief above.
describe("buildWizardPrefill", () => {
  function research(overrides: Partial<LeadResearch> = {}): LeadResearch {
    return {
      business_summary: "A cafe in Leith serving coffee and pastries.",
      services: ["Coffee", "Pastries", "Catering"],
      strengths: ["Great reviews", "Central location"],
      weaknesses: ["No online booking"],
      seo_observations: [],
      missing_trust_signals: [],
      missing_conversion_opportunities: [],
      ai_opportunities: [],
      recommended_services: [],
      suggested_sales_angle: "",
      estimated_project_value_band: "",
      conversion_probability_band: "medium",
      ai_opportunity_fit: "medium",
      pursue_because: "",
      ...overrides,
    };
  }

  function mockup(overrides: Partial<WebsiteMockup> = {}): WebsiteMockup {
    return {
      hero_headline: "Welcome to Leith's favourite cafe",
      hero_subheadline: "Coffee, pastries, and a warm welcome",
      problem_statement: "Struggling to find a good local coffee spot?",
      services: [
        { name: "Coffee", description: "Ethically sourced." },
        { name: "Catering", description: "For your next event." },
      ],
      ai_pitch: "",
      cta_text: "Visit us today",
      ...overrides,
    };
  }

  function prospect(overrides: Partial<PrefillProspect> = {}): PrefillProspect {
    return {
      business_name: "The Leith Coffee House",
      category: "Cafe",
      neighbourhood: "Leith",
      website: "https://leithcoffeehouse.example.com",
      website_mockup: null,
      research: null,
      ...overrides,
    };
  }

  it("prefills every hard field plus servicesProducts and usps from a full mockup+research prospect", () => {
    const prefill = buildWizardPrefill(prospect({ website_mockup: mockup(), research: research() }));

    expect(prefill.sourceBusinessName).toBe("The Leith Coffee House");
    expect(prefill.fields.businessName).toEqual({ value: "The Leith Coffee House", tier: "hard" });
    expect(prefill.fields.industry).toEqual({ value: "Cafe", tier: "hard" });
    expect(prefill.fields.location).toEqual({ value: "Leith", tier: "hard" });
    expect(prefill.fields.existingWebsiteUrl).toEqual({ value: "https://leithcoffeehouse.example.com", tier: "hard" });
    // research.services preferred over website_mockup.services when both exist.
    expect(prefill.fields.servicesProducts).toEqual({ value: "Coffee, Pastries, Catering", tier: "hard" });
    expect(prefill.fields.usps).toEqual({ value: "Great reviews, Central location", tier: "soft" });
  });

  it("falls back to website_mockup service names when no research is on file at all", () => {
    const prefill = buildWizardPrefill(prospect({ website_mockup: mockup(), research: null }));
    expect(prefill.fields.servicesProducts).toEqual({ value: "Coffee, Catering", tier: "hard" });
    // No mockup-derived fallback exists for usps — stays genuinely absent.
    expect(prefill.fields.usps).toBeUndefined();
  });

  it("prefers research.services even when research.services is genuinely empty, rather than reviving stale mockup copy", () => {
    const prefill = buildWizardPrefill(prospect({ website_mockup: mockup(), research: research({ services: [] }) }));
    expect(prefill.fields.servicesProducts).toBeUndefined();
  });

  it("produces only the hard direct-column fields when neither mockup nor research is on file", () => {
    const prefill = buildWizardPrefill(prospect());
    expect(prefill.fields).toEqual({
      businessName: { value: "The Leith Coffee House", tier: "hard" },
      industry: { value: "Cafe", tier: "hard" },
      location: { value: "Leith", tier: "hard" },
      existingWebsiteUrl: { value: "https://leithcoffeehouse.example.com", tier: "hard" },
    });
  });

  it("leaves a field genuinely absent, not empty-string, when the source column is null", () => {
    const prefill = buildWizardPrefill(prospect({ category: null, neighbourhood: null, website: null }));
    expect(prefill.fields.industry).toBeUndefined();
    expect(prefill.fields.location).toBeUndefined();
    expect(prefill.fields.existingWebsiteUrl).toBeUndefined();
  });

  it("never invents targetAudience, objectives, sitemapPages, design fields, or contentNotes", () => {
    const prefill = buildWizardPrefill(prospect({ website_mockup: mockup(), research: research() }));
    const keys = Object.keys(prefill.fields);
    expect(keys).not.toEqual(expect.arrayContaining(["targetAudience", "objectives", "sitemapPages", "designStyle", "designColours", "designFonts", "designExamples", "contentNotes"]));
  });
});

describe("prospectHasPrefillSource", () => {
  it("is false when neither website_mockup nor research is set", () => {
    expect(prospectHasPrefillSource({ website_mockup: null, research: null })).toBe(false);
  });

  it("is true when only website_mockup is set", () => {
    expect(
      prospectHasPrefillSource({
        website_mockup: {
          hero_headline: "h",
          hero_subheadline: "s",
          problem_statement: "p",
          services: [],
          ai_pitch: "a",
          cta_text: "c",
        },
        research: null,
      })
    ).toBe(true);
  });

  it("is true when only research is set", () => {
    expect(
      prospectHasPrefillSource({
        website_mockup: null,
        research: {
          business_summary: "",
          services: [],
          strengths: [],
          weaknesses: [],
          seo_observations: [],
          missing_trust_signals: [],
          missing_conversion_opportunities: [],
          ai_opportunities: [],
          recommended_services: [],
          suggested_sales_angle: "",
          estimated_project_value_band: "",
          conversion_probability_band: "low",
          ai_opportunity_fit: "low",
          pursue_because: "",
        },
      })
    ).toBe(true);
  });
});
