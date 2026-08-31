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

  // QA additions below — boundary/precision cases not in the original 8.

  it("counts a sales-kit timestamp exactly equal to clients.created_at (inclusive <=, per the attribution rule)", () => {
    const result = computeAiAssistedSignedValue(
      [{ id: "c1", business_name: "Exact Co", created_at: "2026-08-10T12:00:00.000Z", source_lead_id: "p1" }],
      [{ id: "p1", deal_value_pence: 1000, sales_kit_generated_at: "2026-08-10T12:00:00.000Z", website_mockup_generated_at: null }],
      NOW
    );
    expect(result.aiAssistedCount).toBe(1);
  });

  it("includes a client created exactly at the local calendar month start, and excludes one 1ms before it", () => {
    const now = new Date(2026, 7, 31, 12, 0, 0); // local August
    const monthStartIso = new Date(2026, 7, 1, 0, 0, 0).toISOString();
    const justBeforeIso = new Date(new Date(2026, 7, 1, 0, 0, 0).getTime() - 1).toISOString();

    const atStart = computeAiAssistedSignedValue(
      [{ id: "c1", business_name: "Boundary Co", created_at: monthStartIso, source_lead_id: null }],
      [],
      now
    );
    expect(atStart.signedThisMonth).toBe(1);

    const beforeStart = computeAiAssistedSignedValue(
      [{ id: "c1", business_name: "Too Early Co", created_at: justBeforeIso, source_lead_id: null }],
      [],
      now
    );
    expect(beforeStart.signedThisMonth).toBe(0);
  });

  it("excludes a client created exactly at the start of next local calendar month (exclusive upper bound)", () => {
    const now = new Date(2026, 7, 15, 12, 0, 0); // local August
    const nextMonthStartIso = new Date(2026, 8, 1, 0, 0, 0).toISOString(); // Sept 1 local
    const result = computeAiAssistedSignedValue(
      [{ id: "c1", business_name: "Next Month Co", created_at: nextMonthStartIso, source_lead_id: null }],
      [],
      now
    );
    expect(result.signedThisMonth).toBe(0);
  });

  it("is immune to mixed ISO timestamp formats/precision within the same second (JS toISOString-style vs Postgres/PostgREST-style)", () => {
    // sales_kit_generated_at as written by draft-sales-kit.ts (JS Date#toISOString(): ms precision, literal "Z")
    // clients.created_at as it can come back from Postgres/PostgREST (timestamptz, offset suffix, more fractional digits)
    // — same real instant ordering as ".999" < ".9999" numerically, which a raw string "<=" would get backwards
    // because "Z" (char code 90) sorts after "9" (char code 57).
    const result = computeAiAssistedSignedValue(
      [{ id: "c1", business_name: "Precise Co", created_at: "2026-08-10T12:00:00.9999+00:00", source_lead_id: "p1" }],
      [{ id: "p1", deal_value_pence: 1000, sales_kit_generated_at: "2026-08-10T12:00:00.999Z", website_mockup_generated_at: null }],
      NOW
    );
    expect(result.aiAssistedCount).toBe(1); // sales kit really was generated first, must count as AI-assisted
  });
});
