import { describe, it, expect } from "vitest";
import { computeAiAssistedSignedValue } from "./studio-ai-roi";

// BACKLOG.md "AI-assisted signed value". What matters most here is what
// this function refuses to count: a client with no prospect to check, a
// prospect touched only after the deal already closed, and a prospect
// whose only AI touch was research (which now runs automatically for
// every discovered prospect, so it's excluded from attribution on
// purpose) — see studio-ai-roi.ts's own header comment for why.

const NOW = new Date("2026-08-31T12:00:00Z");

describe("computeAiAssistedSignedValue", () => {
  it("excludes a client with no source_lead_id from the population entirely", () => {
    const result = computeAiAssistedSignedValue(
      [{ id: "c1", business_name: "Manual Co", created_at: "2026-08-10T00:00:00Z", source_lead_id: null }],
      [],
      NOW
    );
    expect(result.signedThisMonth).toBe(1); // still a real signed client this month...
    expect(result.aiAssistedCount).toBe(0); // ...just not part of this metric's population
    expect(result.aiAssistedClients).toEqual([]);
  });

  it("excludes a prospect whose AI-touch timestamp is after clients.created_at", () => {
    const result = computeAiAssistedSignedValue(
      [{ id: "c1", business_name: "Late Touch Co", created_at: "2026-08-10T00:00:00Z", source_lead_id: "p1" }],
      [
        {
          id: "p1",
          deal_value_pence: 500000,
          sales_kit_generated_at: "2026-08-11T00:00:00Z", // one day AFTER signing
          website_mockup_generated_at: null,
        },
      ],
      NOW
    );
    expect(result.aiAssistedCount).toBe(0);
    expect(result.aiAssistedValuePence).toBeNull();
  });

  it("excludes a prospect with only research_generated_at-equivalent (no sales kit or mockup) set", () => {
    const result = computeAiAssistedSignedValue(
      [{ id: "c1", business_name: "Researched Only Co", created_at: "2026-08-10T00:00:00Z", source_lead_id: "p1" }],
      [
        {
          id: "p1",
          deal_value_pence: 250000,
          sales_kit_generated_at: null,
          website_mockup_generated_at: null,
        },
      ],
      NOW
    );
    expect(result.aiAssistedCount).toBe(0);
    expect(result.aiAssistedClients).toEqual([]);
  });

  it("distinguishes null (no recorded deal values) from a genuine zero sum", () => {
    const noValueResult = computeAiAssistedSignedValue(
      [{ id: "c1", business_name: "No Estimate Co", created_at: "2026-08-10T00:00:00Z", source_lead_id: "p1" }],
      [{ id: "p1", deal_value_pence: null, sales_kit_generated_at: "2026-08-01T00:00:00Z", website_mockup_generated_at: null }],
      NOW
    );
    expect(noValueResult.aiAssistedCount).toBe(1);
    expect(noValueResult.aiAssistedValuePence).toBeNull();

    const withValueResult = computeAiAssistedSignedValue(
      [{ id: "c1", business_name: "Has Estimate Co", created_at: "2026-08-10T00:00:00Z", source_lead_id: "p1" }],
      [{ id: "p1", deal_value_pence: 0, sales_kit_generated_at: "2026-08-01T00:00:00Z", website_mockup_generated_at: null }],
      NOW
    );
    expect(withValueResult.aiAssistedValuePence).toBe(0); // a real recorded £0 estimate, not "no data"
  });

  it("excludes a client signed outside the current calendar month", () => {
    const result = computeAiAssistedSignedValue(
      [
        { id: "c1", business_name: "This Month Co", created_at: "2026-08-05T00:00:00Z", source_lead_id: "p1" },
        { id: "c2", business_name: "Last Month Co", created_at: "2026-07-15T12:00:00Z", source_lead_id: "p2" },
      ],
      [
        { id: "p1", deal_value_pence: 100000, sales_kit_generated_at: "2026-08-01T00:00:00Z", website_mockup_generated_at: null },
        { id: "p2", deal_value_pence: 999999, sales_kit_generated_at: "2026-07-01T00:00:00Z", website_mockup_generated_at: null },
      ],
      NOW
    );
    expect(result.signedThisMonth).toBe(1);
    expect(result.aiAssistedCount).toBe(1);
    expect(result.aiAssistedClients.map((c) => c.clientId)).toEqual(["c1"]);
    expect(result.aiAssistedValuePence).toBe(100000);
  });

  it("sums deal value only across AI-assisted clients with a recorded estimate", () => {
    const result = computeAiAssistedSignedValue(
      [
        { id: "c1", business_name: "Priced Co", created_at: "2026-08-05T00:00:00Z", source_lead_id: "p1" },
        { id: "c2", business_name: "Unpriced Co", created_at: "2026-08-06T00:00:00Z", source_lead_id: "p2" },
      ],
      [
        { id: "p1", deal_value_pence: 150000, sales_kit_generated_at: "2026-08-01T00:00:00Z", website_mockup_generated_at: null },
        { id: "p2", deal_value_pence: null, sales_kit_generated_at: null, website_mockup_generated_at: "2026-08-02T00:00:00Z" },
      ],
      NOW
    );
    expect(result.aiAssistedCount).toBe(2);
    expect(result.aiAssistedValuePence).toBe(150000); // p2's null estimate simply doesn't add
  });

  it("labels touchedVia correctly across sales_kit only, website_mockup only, and both", () => {
    const result = computeAiAssistedSignedValue(
      [
        { id: "c1", business_name: "Kit Co", created_at: "2026-08-05T00:00:00Z", source_lead_id: "p1" },
        { id: "c2", business_name: "Mockup Co", created_at: "2026-08-06T00:00:00Z", source_lead_id: "p2" },
        { id: "c3", business_name: "Both Co", created_at: "2026-08-07T00:00:00Z", source_lead_id: "p3" },
      ],
      [
        { id: "p1", deal_value_pence: null, sales_kit_generated_at: "2026-08-01T00:00:00Z", website_mockup_generated_at: null },
        { id: "p2", deal_value_pence: null, sales_kit_generated_at: null, website_mockup_generated_at: "2026-08-02T00:00:00Z" },
        { id: "p3", deal_value_pence: null, sales_kit_generated_at: "2026-08-01T00:00:00Z", website_mockup_generated_at: "2026-08-02T00:00:00Z" },
      ],
      NOW
    );
    expect(result.aiAssistedClients.find((c) => c.clientId === "c1")?.touchedVia).toBe("sales_kit");
    expect(result.aiAssistedClients.find((c) => c.clientId === "c2")?.touchedVia).toBe("website_mockup");
    expect(result.aiAssistedClients.find((c) => c.clientId === "c3")?.touchedVia).toBe("both");
  });

  it("excludes a client whose source_lead_id points at a prospect not present in the input", () => {
    const result = computeAiAssistedSignedValue(
      [{ id: "c1", business_name: "Orphan Co", created_at: "2026-08-05T00:00:00Z", source_lead_id: "missing-prospect" }],
      [],
      NOW
    );
    expect(result.aiAssistedCount).toBe(0);
  });
});
