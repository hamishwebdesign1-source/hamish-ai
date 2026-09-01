import { describe, it, expect } from "vitest";
import { computeClientEngagementRisk } from "./studio-engagement";

// Command Centre Phase 6c. What matters most here is what this function
// refuses to say: a client that's merely quiet, or merely has an overdue
// invoice, is real but low-confidence ("warning"); only two real signals
// agreeing, or a genuinely long silence, earns "critical". And a client
// with neither signal never appears at all — there is no "ok" row.

const NOW = new Date("2026-08-25T12:00:00Z"); // a Tuesday

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

describe("computeClientEngagementRisk", () => {
  it("omits a client with recent activity and no overdue invoice entirely", () => {
    const risks = computeClientEngagementRisk(
      [{ id: "c1", business_name: "Acme" }],
      [{ client_id: "c1", created_at: daysAgo(2) }],
      [],
      NOW
    );
    expect(risks).toEqual([]);
  });

  it("flags a client quiet for 2+ weeks as warning, not critical", () => {
    const risks = computeClientEngagementRisk(
      [{ id: "c1", business_name: "Acme" }],
      [{ client_id: "c1", created_at: daysAgo(20) }], // last contact ~3 weeks ago
      [],
      NOW
    );
    expect(risks).toHaveLength(1);
    expect(risks[0].tier).toBe("warning");
    expect(risks[0].hasOverdueInvoice).toBe(false);
  });

  it("flags a client silent for a full month as critical on quiet weeks alone", () => {
    const risks = computeClientEngagementRisk(
      [{ id: "c1", business_name: "Acme" }],
      [{ client_id: "c1", created_at: daysAgo(60) }],
      [],
      NOW
    );
    expect(risks[0].tier).toBe("critical");
    expect(risks[0].quietWeeks).toBe(6);
  });

  it("escalates to critical when a shorter silence stacks with an overdue invoice", () => {
    const risks = computeClientEngagementRisk(
      [{ id: "c1", business_name: "Acme" }],
      [{ client_id: "c1", created_at: daysAgo(16) }], // ~2 quiet weeks
      [{ id: "inv-1", client_id: "c1", status: "open", due_date: "2026-08-01", reminder_sent_at: null }], // well past due
      NOW
    );
    expect(risks[0].tier).toBe("critical");
    expect(risks[0].hasOverdueInvoice).toBe(true);
  });

  it("flags an overdue invoice on its own as warning even with recent contact", () => {
    const risks = computeClientEngagementRisk(
      [{ id: "c1", business_name: "Acme" }],
      [{ client_id: "c1", created_at: daysAgo(1) }],
      [{ id: "inv-1", client_id: "c1", status: "open", due_date: "2026-08-01", reminder_sent_at: null }],
      NOW
    );
    expect(risks[0].tier).toBe("warning");
  });

  it("ignores a paid invoice and a not-yet-due invoice — neither counts as overdue", () => {
    const risks = computeClientEngagementRisk(
      [{ id: "c1", business_name: "Acme" }],
      [{ client_id: "c1", created_at: daysAgo(20) }],
      [
        { id: "inv-paid", client_id: "c1", status: "paid", due_date: "2026-08-01", reminder_sent_at: null },
        { id: "inv-future", client_id: "c1", status: "open", due_date: "2026-09-30", reminder_sent_at: null },
      ],
      NOW
    );
    expect(risks[0].hasOverdueInvoice).toBe(false);
    expect(risks[0].tier).toBe("warning"); // from quiet weeks alone
    expect(risks[0].overdueInvoiceId).toBeNull();
  });

  it("surfaces the specific overdue invoice's id and reminder_sent_at", () => {
    const risks = computeClientEngagementRisk(
      [{ id: "c1", business_name: "Acme" }],
      [{ client_id: "c1", created_at: daysAgo(1) }],
      [{ id: "inv-1", client_id: "c1", status: "open", due_date: "2026-08-01", reminder_sent_at: "2026-08-20T09:00:00Z" }],
      NOW
    );
    expect(risks[0].overdueInvoiceId).toBe("inv-1");
    expect(risks[0].reminderSentAt).toBe("2026-08-20T09:00:00Z");
  });

  it("picks the earliest-due overdue invoice when a client has more than one", () => {
    const risks = computeClientEngagementRisk(
      [{ id: "c1", business_name: "Acme" }],
      [{ client_id: "c1", created_at: daysAgo(1) }],
      [
        { id: "inv-later", client_id: "c1", status: "open", due_date: "2026-08-10", reminder_sent_at: null },
        { id: "inv-earliest", client_id: "c1", status: "open", due_date: "2026-07-01", reminder_sent_at: null },
        { id: "inv-mid", client_id: "c1", status: "open", due_date: "2026-07-20", reminder_sent_at: null },
      ],
      NOW
    );
    expect(risks[0].overdueInvoiceId).toBe("inv-earliest");
  });

  it("never lets one client's requests or invoices count toward another client's risk", () => {
    const risks = computeClientEngagementRisk(
      [
        { id: "c1", business_name: "Quiet Co" },
        { id: "c2", business_name: "Active Co" },
      ],
      [{ client_id: "c2", created_at: daysAgo(1) }],
      [], // c2's invoice history is clean — isolation is the point, not the invoice rule
      NOW
    );
    // c1 has zero requests/invoices of its own -> maximally quiet, no
    // overdue invoice of its own -> critical on silence alone. If c1 had
    // inherited c2's recent contact, it would wrongly disappear instead.
    const c1 = risks.find((r) => r.clientId === "c1");
    const c2 = risks.find((r) => r.clientId === "c2");
    expect(c1?.tier).toBe("critical");
    expect(c1?.hasOverdueInvoice).toBe(false);
    expect(c2).toBeUndefined(); // recent contact, no overdue invoice — genuinely not at risk
  });

  it("ranks critical clients before warning, and longer silences first within a tier", () => {
    const risks = computeClientEngagementRisk(
      [
        { id: "c-warn", business_name: "Warn Co" },
        { id: "c-crit-longer", business_name: "Crit Long Co" },
        { id: "c-crit-shorter", business_name: "Crit Short Co" },
      ],
      [
        { client_id: "c-warn", created_at: daysAgo(16) }, // ~2 quiet weeks -> warning
        { client_id: "c-crit-shorter", created_at: daysAgo(30) }, // ~4 quiet weeks -> critical
        { client_id: "c-crit-longer", created_at: daysAgo(90) }, // fully silent -> critical
      ],
      [],
      NOW
    );
    expect(risks.map((r) => r.clientId)).toEqual(["c-crit-longer", "c-crit-shorter", "c-warn"]);
  });

  it("builds exactly 6 week cells, oldest to newest", () => {
    const risks = computeClientEngagementRisk(
      [{ id: "c1", business_name: "Acme" }],
      [{ client_id: "c1", created_at: daysAgo(60) }],
      [],
      NOW
    );
    expect(risks[0].weeks).toHaveLength(6);
    expect(risks[0].weeks.every((w) => w.active === false)).toBe(true);
  });

  // Roadmap item #3 ("predictive churn detection") — early_warning is the
  // new case: recent contact (0-1 quiet weeks, no overdue invoice — the
  // existing rules alone say "not at risk"), but a real, meaningful drop
  // in contact frequency versus the 3 weeks before.
  describe("declining-trend early warning", () => {
    it("flags a client whose contact frequency has genuinely dropped, even with recent contact", () => {
      const risks = computeClientEngagementRisk(
        [{ id: "c1", business_name: "Acme" }],
        [
          // Prior 3 weeks: steady weekly contact (well above the activity
          // floor). Recent 3 weeks: one single request days ago — a real
          // slowdown, not silence (quietWeeks stays 0).
          { client_id: "c1", created_at: daysAgo(38) },
          { client_id: "c1", created_at: daysAgo(31) },
          { client_id: "c1", created_at: daysAgo(24) },
          { client_id: "c1", created_at: daysAgo(2) },
        ],
        [],
        NOW
      );
      expect(risks).toHaveLength(1);
      expect(risks[0].tier).toBe("early_warning");
      expect(risks[0].trend).toBe("declining");
      expect(risks[0].quietWeeks).toBe(0);
    });

    it("never flags a client with too little history to call a real trend", () => {
      // Only 1 request in the prior window (under MIN_PRIOR_ACTIVITY) plus
      // one recent enough to keep quietWeeks at 0 — neither threshold nor
      // trend has enough to say anything real, so this client shouldn't
      // appear at all, not read as "declining" from a single data point.
      const risks = computeClientEngagementRisk(
        [{ id: "c1", business_name: "Acme" }],
        [{ client_id: "c1", created_at: daysAgo(24) }, { client_id: "c1", created_at: daysAgo(2) }],
        [],
        NOW
      );
      expect(risks).toEqual([]);
    });

    it("does not flag a client whose contact frequency is steady, not declining", () => {
      const risks = computeClientEngagementRisk(
        [{ id: "c1", business_name: "Acme" }],
        [
          { client_id: "c1", created_at: daysAgo(38) },
          { client_id: "c1", created_at: daysAgo(31) },
          { client_id: "c1", created_at: daysAgo(24) },
          { client_id: "c1", created_at: daysAgo(17) },
          { client_id: "c1", created_at: daysAgo(10) },
          { client_id: "c1", created_at: daysAgo(3) },
        ],
        [],
        NOW
      );
      expect(risks).toEqual([]);
    });

    it("never lets a declining trend downgrade an already-critical or -warning tier", () => {
      const risks = computeClientEngagementRisk(
        [{ id: "c1", business_name: "Acme" }],
        [
          // All 3 in the prior window (weeks 0-2), none in weeks 3-5 ->
          // quietWeeks=4 on its own already means "critical"; the same
          // silence also reads as a declining trend (recentCount 0 <=
          // half of priorCount 3). Tier must stay critical either way.
          { client_id: "c1", created_at: daysAgo(40) },
          { client_id: "c1", created_at: daysAgo(38) },
          { client_id: "c1", created_at: daysAgo(31) },
        ],
        [],
        NOW
      );
      expect(risks[0].tier).toBe("critical");
      expect(risks[0].quietWeeks).toBe(4);
      expect(risks[0].trend).toBe("declining");
    });

    it("sorts early_warning after both critical and warning", () => {
      const risks = computeClientEngagementRisk(
        [
          { id: "c-early", business_name: "Early Co" },
          { id: "c-warn", business_name: "Warn Co" },
          { id: "c-crit", business_name: "Crit Co" },
        ],
        [
          { client_id: "c-early", created_at: daysAgo(38) },
          { client_id: "c-early", created_at: daysAgo(31) },
          { client_id: "c-early", created_at: daysAgo(24) },
          { client_id: "c-early", created_at: daysAgo(2) },
          { client_id: "c-warn", created_at: daysAgo(16) }, // ~2 quiet weeks -> warning
          { client_id: "c-crit", created_at: daysAgo(90) }, // fully silent -> critical
        ],
        [],
        NOW
      );
      expect(risks.map((r) => r.clientId)).toEqual(["c-crit", "c-warn", "c-early"]);
    });
  });
});
