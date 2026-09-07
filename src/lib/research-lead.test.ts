import { describe, it, expect } from "vitest";
import { identityForResearch, recommendedServicesDescription, buildResearchTool, buildSystemPrompt } from "./research-lead";
import { findAgencyType } from "@/lib/agency-types";
import type { SalesKitSender } from "@/lib/draft-sales-kit";

// Prospect-generation pipeline audit (2026-09-07) — research-lead.ts's
// buildSystemPrompt() and RESEARCH_TOOL both used to hardcode "Hamish AI,
// a small Edinburgh-based AI/web consultancy" with no sender parameter at
// all, and live testing confirmed the RESEARCH_TOOL hardcode specifically
// skewed recommended_services toward Hamish's own service catalogue even
// for a tenant whose surrounding prompt correctly named a different
// business. These tests cover the fix's two load-bearing guarantees: (1)
// HamishAI's own internal framing is byte-identical to before the change,
// and (2) a real tenant with an agencyType gets that agency's own services
// named instead.

const internalSender: SalesKitSender = { name: "Hamish AI", isInternal: true };

const automationAgencyType = findAgencyType("AI Automation");
if (!automationAgencyType) throw new Error("Fixture setup failed: 'AI Automation' agency type not found in agency-types.ts");

const tenantSenderWithAgencyType: SalesKitSender = {
  name: "Ledger & Co",
  isInternal: false,
  agencyType: automationAgencyType,
};

const genericTenantSender: SalesKitSender = { name: "Ledger & Co", isInternal: false, agencyType: null };

const lead = {
  business_name: "Low Rates Auto Repairs",
  category: "Auto Repair Shop",
  neighbourhood: "Akron, Ohio",
  signal: null,
  outreach_note: null,
};

describe("identityForResearch", () => {
  it("returns the original hardcoded Hamish AI framing verbatim for an internal sender", () => {
    expect(identityForResearch(internalSender)).toBe("Hamish AI, a small Edinburgh-based AI/web consultancy");
  });

  it("names the agency's own type and services for a non-internal sender with an agencyType", () => {
    const identity = identityForResearch(tenantSenderWithAgencyType);
    expect(identity).toContain("Ledger & Co");
    expect(identity).toContain("AI Automation agency");
    for (const service of automationAgencyType.services) {
      expect(identity).toContain(service);
    }
    // Never leaks Hamish's own identity into a real tenant's framing.
    expect(identity).not.toContain("Hamish");
  });

  it("falls back to a generic AI/web consultancy framing when no agencyType is known", () => {
    const identity = identityForResearch(genericTenantSender);
    expect(identity).toContain("Ledger & Co");
    expect(identity).not.toContain("Hamish");
  });
});

describe("buildSystemPrompt", () => {
  it("produces the exact original opening sentence for an internal sender (no behaviour change for HamishAI's own leads)", () => {
    const prompt = buildSystemPrompt(lead, null, "", internalSender);
    expect(prompt).toContain(
      "You are researching a small business as a lead-qualification step for Hamish AI, a small Edinburgh-based AI/web consultancy. Everything you produce is for INTERNAL prioritisation only"
    );
  });

  it("frames the opening sentence around the real tenant and their agency type instead", () => {
    const prompt = buildSystemPrompt(lead, null, "", tenantSenderWithAgencyType);
    expect(prompt).toContain(`for ${identityForResearch(tenantSenderWithAgencyType)}. Everything you produce is for INTERNAL prioritisation only`);
    expect(prompt).not.toContain("Hamish AI, a small Edinburgh-based AI/web consultancy");
  });
});

describe("recommendedServicesDescription", () => {
  it("keeps the original Hamish AI wording verbatim for an internal sender", () => {
    expect(recommendedServicesDescription(internalSender)).toBe(
      "Which Hamish AI service(s) fit best (redesign, AI chat assistant, booking system, etc.)."
    );
  });

  it("names the tenant's own agency-type services instead of Hamish's for a non-internal sender with an agencyType", () => {
    const description = recommendedServicesDescription(tenantSenderWithAgencyType);
    expect(description).toContain("Ledger & Co's own typical services");
    for (const service of automationAgencyType.services) {
      expect(description).toContain(service);
    }
    expect(description).not.toContain("Hamish");
    expect(description).not.toContain("redesign, AI chat assistant, booking system");
  });

  it("gives a genuinely service-agnostic description when no agencyType is known", () => {
    const description = recommendedServicesDescription(genericTenantSender);
    expect(description).not.toContain("Hamish");
    expect(description).not.toContain("redesign, AI chat assistant, booking system");
    expect(description.toLowerCase()).toContain("don't assume any specific service catalogue");
  });
});

describe("buildResearchTool", () => {
  it("leaves every field except recommended_services' description byte-identical between senders", () => {
    const internalTool = buildResearchTool(internalSender);
    const tenantTool = buildResearchTool(tenantSenderWithAgencyType);

    const internalProps = internalTool.input_schema.properties as Record<string, unknown>;
    const tenantProps = tenantTool.input_schema.properties as Record<string, unknown>;

    for (const key of Object.keys(internalProps)) {
      if (key === "recommended_services") continue;
      expect(tenantProps[key]).toEqual(internalProps[key]);
    }
    expect(internalTool.input_schema.required).toEqual(tenantTool.input_schema.required);
    expect(internalTool.name).toBe(tenantTool.name);
    expect(internalTool.description).toBe(tenantTool.description);
  });

  it("wires recommendedServicesDescription's own output into the schema for each sender", () => {
    const tool = buildResearchTool(tenantSenderWithAgencyType);
    const props = tool.input_schema.properties as Record<string, { description?: string }>;
    expect(props.recommended_services.description).toBe(recommendedServicesDescription(tenantSenderWithAgencyType));
  });
});
