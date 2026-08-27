import { describe, it, expect } from "vitest";
import { stripTriage, isWellFormed } from "./triage-request";

function triage(overrides: Partial<ReturnType<typeof stripTriage>> = {}) {
  return {
    category: "bug",
    complexity: "S",
    suggested_approach: "Fix the broken link on the homepage.",
    covered_by_maintenance: true,
    coverage_reasoning: "Small bug fix, covered under the basic plan.",
    draft_response: "Thanks for flagging this — we'll get it fixed shortly.",
    priority: "medium",
    missing_info: [] as string[],
    suggested_task: undefined,
    ...overrides,
  };
}

describe("stripTriage", () => {
  it("leaves a well-formed tool-call result unchanged", () => {
    const input = triage();
    expect(stripTriage(input)).toEqual(input);
  });

  // The exact real bug this fix closes — missing_info coming back as a
  // bare string instead of an array, previously read unguarded via
  // `triage.missing_info?.length` to decide status.
  it("coerces a bare string missing_info into a single-item array rather than crashing on .length", () => {
    const result = stripTriage(triage({ missing_info: "What's the deadline?" as unknown as string[] }));
    expect(result.missing_info).toEqual(["What's the deadline?"]);
  });

  it("coerces a missing missing_info field to an empty array", () => {
    const malformed = { ...triage() };
    delete (malformed as Record<string, unknown>).missing_info;
    const result = stripTriage(malformed);
    expect(result.missing_info).toEqual([]);
  });

  it("drops non-string entries out of missing_info rather than crashing", () => {
    const result = stripTriage(triage({ missing_info: ["Real question", 42, null, "Another real question"] as unknown as string[] }));
    expect(result.missing_info).toEqual(["Real question", "Another real question"]);
  });

  it("falls back an invalid category/complexity/priority enum value to a safe default", () => {
    const result = stripTriage(triage({ category: "not-a-real-category", complexity: "XXL", priority: "critical" } as unknown as Partial<ReturnType<typeof stripTriage>>));
    expect(result.category).toBe("other");
    expect(result.complexity).toBe("M");
    expect(result.priority).toBe("medium");
  });

  it("coerces a non-boolean covered_by_maintenance to false rather than trusting a truthy value", () => {
    const result = stripTriage(triage({ covered_by_maintenance: "yes" as unknown as boolean }));
    expect(result.covered_by_maintenance).toBe(false);
  });

  it("strips markdown emphasis from draft_response and suggested_approach", () => {
    const result = stripTriage(
      triage({
        draft_response: "We'll get this **sorted** shortly.",
        suggested_approach: "Update the *broken* link.",
      })
    );
    expect(result.draft_response).toBe("We'll get this sorted shortly.");
    expect(result.suggested_approach).toBe("Update the broken link.");
  });

  it("drops a suggested_task that comes back completely empty rather than saving a blank one", () => {
    const result = stripTriage(triage({ suggested_task: { title: "", description: "", acceptance_criteria: "" } }));
    expect(result.suggested_task).toBeUndefined();
  });

  it("keeps a suggested_task that has at least one real field", () => {
    const result = stripTriage(triage({ suggested_task: { title: "Fix link", description: "", acceptance_criteria: "" } }));
    expect(result.suggested_task).toEqual({ title: "Fix link", description: "", acceptance_criteria: "" });
  });

  it("defaults every field to a safe value when given completely garbage input", () => {
    expect(stripTriage("not an object")).toEqual({
      category: "other",
      complexity: "M",
      suggested_approach: "",
      covered_by_maintenance: false,
      coverage_reasoning: "",
      draft_response: "",
      priority: "medium",
      missing_info: [],
      suggested_task: undefined,
    });
  });

  it("handles null/undefined input the same as an empty object", () => {
    expect(stripTriage(null)).toEqual(stripTriage({}));
    expect(stripTriage(undefined)).toEqual(stripTriage({}));
  });
});

describe("isWellFormed", () => {
  it("is true for a fully populated triage result", () => {
    expect(isWellFormed(triage())).toBe(true);
  });

  it("is true even when missing_info is empty — that's a legitimate result, not a malformed one", () => {
    expect(isWellFormed(triage({ missing_info: [] }))).toBe(true);
  });

  it("is false when any required text field is empty", () => {
    expect(isWellFormed(triage({ draft_response: "" }))).toBe(false);
    expect(isWellFormed(triage({ suggested_approach: "" }))).toBe(false);
    expect(isWellFormed(triage({ coverage_reasoning: "" }))).toBe(false);
  });

  it("agrees with stripTriage's own output on malformed input — never well-formed", () => {
    expect(isWellFormed(stripTriage("garbage"))).toBe(false);
  });
});
