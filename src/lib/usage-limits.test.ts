import { describe, it, expect, beforeEach } from "vitest";
import { getUsageStatus, ALL_USAGE_EVENT_TYPES, USAGE_LABELS, type UsageEventType } from "./usage-limits";
import { getPlatformPlan } from "./platform-plans";

// getSupabaseAdmin() (src/lib/supabase.ts) returns null whenever
// SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY aren't set, and getUsageStatus()
// computes `limit` *before* touching Supabase at all — so with those two
// unset, getUsageStatus exercises limitFor()'s real multiplier math with
// zero DB mocking, exactly like every other real-computation test in this
// suite. Every real deployment always has both set, so this is purely a
// test-isolation concern, not a behaviour this file is claiming exists in
// production.
beforeEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("getUsageStatus limit computation", () => {
  it("caps prospect_researched at exactly the plan's own prospectsPerMonth", async () => {
    for (const slug of ["starter", "professional", "agency"] as const) {
      const status = await getUsageStatus("org-1", "prospect_researched", slug);
      expect(status.limit).toBe(getPlatformPlan(slug).prospectsPerMonth);
    }
  });

  it.each([
    ["sales_kit_generated", 2],
    ["website_mockup_generated", 2],
    ["icp_built", 3],
    ["request_triaged", 5],
    ["clients_copilot_question", 10],
    ["layout_redesign_proposed", 10],
    ["website_brief_generated", 3],
    ["website_build_prompt_generated", 3],
    ["website_troubleshooting_generated", 10],
  ] as [UsageEventType, number][])("caps %s at %sx the plan's prospectsPerMonth", async (eventType, multiplier) => {
    const status = await getUsageStatus("org-1", eventType, "professional");
    expect(status.limit).toBe(getPlatformPlan("professional").prospectsPerMonth * multiplier);
  });

  it("gives every plan tier proportionally more headroom, not a flat number", async () => {
    const starter = await getUsageStatus("org-1", "sales_kit_generated", "starter");
    const agency = await getUsageStatus("org-1", "sales_kit_generated", "agency");
    expect(agency.limit).toBeGreaterThan(starter.limit);
  });

  it("reports zero usage and full remaining headroom when Supabase isn't configured (fails open)", async () => {
    const status = await getUsageStatus("org-1", "prospect_researched", "starter");
    expect(status).toEqual({ used: 0, limit: 30, remaining: 30, allowed: true });
  });
});

describe("ALL_USAGE_EVENT_TYPES / USAGE_LABELS", () => {
  it("lists exactly 10 distinct event types with no duplicates", () => {
    expect(ALL_USAGE_EVENT_TYPES).toHaveLength(10);
    expect(new Set(ALL_USAGE_EVENT_TYPES).size).toBe(10);
  });

  it("has a human-readable label for every real usage type, and no orphan labels", () => {
    for (const type of ALL_USAGE_EVENT_TYPES) {
      expect(USAGE_LABELS[type]).toBeTruthy();
    }
    expect(Object.keys(USAGE_LABELS).sort()).toEqual([...ALL_USAGE_EVENT_TYPES].sort());
  });
});
