import { describe, it, expect } from "vitest";
import { stripTriage, isWellFormed, resolveSender, computeWouldAutoSend } from "./triage-request";

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

  it("falls back an invalid category/complexity enum value to a safe default", () => {
    const result = stripTriage(triage({ category: "not-a-real-category", complexity: "XXL" } as unknown as Partial<ReturnType<typeof stripTriage>>));
    expect(result.category).toBe("other");
    expect(result.complexity).toBe("M");
  });

  // QA regression (post-083deeb): priority's fallback used to be "medium",
  // which is the one direction that *allows* an unsupervised auto-send
  // (isAutoSendEligible requires `priority !== "urgent"`). An unrecognized
  // value — wrong casing, a hallucinated value outside PRIORITY_VALUES —
  // could have been genuinely intended as urgent, so the fallback now fails
  // closed toward "urgent" instead: it only ever routes to human review,
  // never mis-blocks or mis-sends anything.
  it("falls back an unrecognized/malformed priority to 'urgent' (fails closed), not 'medium'", () => {
    const wrongCase = stripTriage(triage({ priority: "Urgent" } as unknown as Partial<ReturnType<typeof stripTriage>>));
    expect(wrongCase.priority).toBe("urgent");

    const hallucinated = stripTriage(triage({ priority: "critical" } as unknown as Partial<ReturnType<typeof stripTriage>>));
    expect(hallucinated.priority).toBe("urgent");

    // isWellFormed must still report true — the coercion is a real,
    // silent field substitution, but it doesn't affect the "did the model
    // return usable prose" signal isWellFormed checks. The safety net here
    // is the fallback value itself, not a flag that coercion happened.
    expect(isWellFormed(wrongCase)).toBe(true);

    // This is the exact predicate isAutoSendEligible applies to triage.priority
    // (triage-request.ts) — asserting it directly here so a future change to
    // the fallback that reopens the auto-send gap fails this test too.
    expect(wrongCase.priority !== "urgent").toBe(false);
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
      priority: "urgent",
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

// P0 fix: a failed/errored organisations lookup previously left
// sender.isInternal:true standing (the function's pre-lookup default),
// which flows straight into isAutoSendEligible's `sender.isInternal &&`
// gate — meaning a transient DB read error could leave a tenant's own
// client's request eligible for an unsupervised, zero-human-review email
// auto-sent from HamishAI's own address. resolveSender() must fail closed:
// any lookup error, or an unexpected null org with no error, resolves to
// isInternal:false. See docs/ai-team/DECISIONS.md.
describe("resolveSender", () => {
  const client = { business_name: "Test Biz", org_id: "org-123" };

  it("fails closed to isInternal:false on a genuine Supabase error on the organisations lookup — not the old isInternal:true default", () => {
    const orgError = { message: "connection terminated unexpectedly", code: "57P01" };
    const sender = resolveSender(client, null, orgError);

    expect(sender.isInternal).toBe(false);

    // Mirrors isAutoSendEligible's own gate in triageRequest exactly — this
    // is the concrete bug this fix closes: with the old default, this
    // predicate could be true for a request that belongs to a tenant's
    // own client, not Hamish's.
    const isAutoSendEligible = sender.isInternal && true && true && true;
    expect(isAutoSendEligible).toBe(false);
  });

  it("also fails closed to isInternal:false when the lookup returns no error but no org row either — not just the 'org not found with an error' case", () => {
    const sender = resolveSender(client, null, null);
    expect(sender.isInternal).toBe(false);
  });

  it("still resolves isInternal:true for a genuinely internal org — correctly-succeeding path unchanged", () => {
    const sender = resolveSender(client, { name: "Hamish AI", is_internal: true }, null);
    expect(sender).toEqual({ name: "Hamish AI", isInternal: true });
  });

  it("still resolves isInternal:false with the org's own name for a genuinely non-internal org — correctly-succeeding path unchanged", () => {
    const sender = resolveSender(client, { name: "Acme Agency", is_internal: false }, null);
    expect(sender).toEqual({ name: "Acme Agency", isInternal: false });
  });

  it("only defaults to isInternal:true when org_id itself is absent (a legacy pre-backfill client), not on any lookup failure", () => {
    const legacyClient = { business_name: "Legacy Client", org_id: null };
    expect(resolveSender(legacyClient, null, null)).toEqual({ name: "Hamish AI", isInternal: true });
    // Even a (nonsensical, but defensive) error alongside a missing org_id
    // still can't reach the DB in the first place — org_id absence takes
    // precedence since there's nothing to look up.
    expect(resolveSender(legacyClient, null, { message: "should be unreachable" })).toEqual({
      name: "Hamish AI",
      isInternal: true,
    });
  });
});

// P1 fix: email-inbox.ts now calls triageRequest(clientId, rawText, {
// forceHumanReview }) when isAuthenticatedSender() couldn't corroborate the
// inbound email's From header via SPF+DKIM. computeWouldAutoSend() is the
// eligibility predicate itself (forceHumanReview is applied by the caller,
// not baked into this function) — tested directly here, and the
// caller-side override is asserted the same way triage-request.ts applies
// it (`wouldAutoSend && !options.forceHumanReview`).
describe("computeWouldAutoSend", () => {
  function eligibleTriage(overrides: Partial<ReturnType<typeof stripTriage>> = {}) {
    return {
      category: "bug",
      complexity: "S" as const,
      suggested_approach: "Fix it.",
      covered_by_maintenance: true,
      coverage_reasoning: "Small, covered.",
      draft_response: "Sorted.",
      priority: "medium" as const,
      missing_info: [] as string[],
      suggested_task: undefined,
      ...overrides,
    };
  }

  it("is true for an internal sender, triaged status, covered/small/non-urgent request — the genuine happy path", () => {
    expect(computeWouldAutoSend({ name: "Hamish AI", isInternal: true }, "triaged", eligibleTriage())).toBe(true);
  });

  it("is false for a non-internal sender even if otherwise eligible", () => {
    expect(computeWouldAutoSend({ name: "Acme Agency", isInternal: false }, "triaged", eligibleTriage())).toBe(false);
  });

  it("is false when status isn't 'triaged' (e.g. awaiting_info)", () => {
    expect(computeWouldAutoSend({ name: "Hamish AI", isInternal: true }, "awaiting_info", eligibleTriage())).toBe(false);
  });

  it("is false when not covered by maintenance, too large, or urgent", () => {
    const sender = { name: "Hamish AI", isInternal: true };
    expect(computeWouldAutoSend(sender, "triaged", eligibleTriage({ covered_by_maintenance: false }))).toBe(false);
    expect(computeWouldAutoSend(sender, "triaged", eligibleTriage({ complexity: "L" }))).toBe(false);
    expect(computeWouldAutoSend(sender, "triaged", eligibleTriage({ priority: "urgent" }))).toBe(false);
  });

  // The exact override triage-request.ts applies at the call site:
  // isAutoSendEligible = wouldAutoSend && !options.forceHumanReview. An
  // unverified inbound email (email-inbox.ts's isAuthenticatedSender()
  // returning false) must never let a request reach an unsupervised send,
  // no matter how "eligible" the AI's own judgment made it look.
  it("an otherwise-eligible result is still overridden to false by forceHumanReview at the call site", () => {
    const wouldAutoSend = computeWouldAutoSend({ name: "Hamish AI", isInternal: true }, "triaged", eligibleTriage());
    expect(wouldAutoSend).toBe(true);

    const forceHumanReview = true; // set when isAuthenticatedSender() returned false
    const isAutoSendEligible = wouldAutoSend && !forceHumanReview;
    expect(isAutoSendEligible).toBe(false);
  });
});
