import { describe, it, expect } from "vitest";
import { computeRecentClientActivity } from "./studio-client-activity";

describe("computeRecentClientActivity", () => {
  it("returns nothing for an org with no clients yet", () => {
    expect(computeRecentClientActivity([], [], [], [])).toEqual([]);
  });

  it("merges every real event kind into one feed, newest first", () => {
    const items = computeRecentClientActivity(
      [{ id: "c1", business_name: "Acme", created_at: "2026-08-01T00:00:00Z" }],
      [{ id: "r1", client_id: "c1", raw_text: "Fix the contact form", created_at: "2026-08-10T00:00:00Z", responded_at: "2026-08-11T00:00:00Z" }],
      [{ id: "i1", client_id: "c1", amount_pence: 50000, description: "August retainer", paid_at: "2026-08-15T00:00:00Z" }],
      [{ id: "p1", client_id: "c1", name: "Website redesign", created_at: "2026-08-20T00:00:00Z" }]
    );

    // client_joined, request_received, request_responded, invoice_paid, project_started
    expect(items).toHaveLength(5);
    expect(items.map((i) => i.kind)).toEqual([
      "project_started",
      "invoice_paid",
      "request_responded",
      "request_received",
      "client_joined",
    ]);
  });

  it("skips an invoice that hasn't been paid yet", () => {
    const items = computeRecentClientActivity(
      [{ id: "c1", business_name: "Acme", created_at: "2026-08-01T00:00:00Z" }],
      [],
      [{ id: "i1", client_id: "c1", amount_pence: 10000, description: "Deposit", paid_at: null }],
      []
    );
    expect(items.some((i) => i.kind === "invoice_paid")).toBe(false);
  });

  it("skips a request that hasn't been responded to yet, but still shows it was received", () => {
    const items = computeRecentClientActivity(
      [{ id: "c1", business_name: "Acme", created_at: "2026-08-01T00:00:00Z" }],
      [{ id: "r1", client_id: "c1", raw_text: "Update opening hours", created_at: "2026-08-10T00:00:00Z", responded_at: null }],
      [],
      []
    );
    expect(items.map((i) => i.kind)).toEqual(["request_received", "client_joined"]);
  });

  it("drops a row whose client isn't in the roster passed in, rather than showing a blank name", () => {
    const items = computeRecentClientActivity(
      [],
      [{ id: "r1", client_id: "ghost", raw_text: "Orphaned request", created_at: "2026-08-10T00:00:00Z", responded_at: null }],
      [],
      []
    );
    expect(items).toEqual([]);
  });

  it("truncates a long request instead of overflowing the feed row", () => {
    const longText = "a".repeat(200);
    const items = computeRecentClientActivity(
      [{ id: "c1", business_name: "Acme", created_at: "2026-08-01T00:00:00Z" }],
      [{ id: "r1", client_id: "c1", raw_text: longText, created_at: "2026-08-10T00:00:00Z", responded_at: null }],
      [],
      []
    );
    const requestItem = items.find((i) => i.kind === "request_received")!;
    expect(requestItem.detail.length).toBeLessThanOrEqual(80);
    expect(requestItem.detail.endsWith("…")).toBe(true);
  });

  it("caps the feed at 8 items even when more real events exist", () => {
    const clients = Array.from({ length: 12 }, (_, i) => ({
      id: `c${i}`,
      business_name: `Client ${i}`,
      created_at: new Date(2026, 7, i + 1).toISOString(),
    }));
    const items = computeRecentClientActivity(clients, [], [], []);
    expect(items).toHaveLength(8);
  });
});
