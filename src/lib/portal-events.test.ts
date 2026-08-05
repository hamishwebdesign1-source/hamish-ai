import { describe, it, expect } from "vitest";
import { buildAutomationEvents } from "./portal-events";

// Pure-function coverage for the transform shared by the Insights page's
// "Recent activity" feed and the header notification bell — a bug here
// would silently wrong-order or drop events in both places at once.
describe("buildAutomationEvents", () => {
  it("returns the newest events first, across all three source types", () => {
    const events = buildAutomationEvents(
      [{ id: "r1", auto_sent: true, responded_at: "2026-08-01T09:00:00Z" }],
      [{ checked_at: "2026-08-03T09:00:00Z", uptime_ok: true }],
      [{ amount_pence: 5000, paid_at: "2026-08-02T09:00:00Z", created_at: "2026-07-30T09:00:00Z" }]
    );

    // Expected chronological order (newest first): site check (08-03),
    // payment received (08-02), auto-reply (08-01), invoice created (07-30).
    expect(events.map((e) => e.label)).toEqual([
      "Site health check ran",
      "Payment received",
      "AI auto-replied to your request",
      "Invoice generated",
    ]);
  });

  it("only includes an auto-reply event for requests that were actually auto-sent and responded to", () => {
    const events = buildAutomationEvents(
      [
        { id: "r1", auto_sent: false, responded_at: "2026-08-01T09:00:00Z" },
        { id: "r2", auto_sent: true, responded_at: null },
        { id: "r3", auto_sent: true, responded_at: "2026-08-01T09:00:00Z" },
      ],
      [],
      []
    );

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("auto-r3");
  });

  it("respects the limit", () => {
    const invoices = Array.from({ length: 5 }, (_, i) => ({
      amount_pence: 1000,
      paid_at: null,
      created_at: `2026-08-0${i + 1}T09:00:00Z`,
    }));

    const events = buildAutomationEvents([], [], invoices, 2);
    expect(events).toHaveLength(2);
  });

  it("returns an empty array when there is no activity", () => {
    expect(buildAutomationEvents([], [], [])).toEqual([]);
  });
});
