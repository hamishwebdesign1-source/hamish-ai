import { describe, it, expect } from "vitest";
import { computeActionQueue } from "./studio-action-queue";
import type { FollowUpDue } from "./studio-briefing";

describe("computeActionQueue", () => {
  it("returns nothing when there's genuinely nothing due", () => {
    expect(computeActionQueue([], [], [], [], "2026-08-31")).toEqual([]);
  });

  it("turns a follow-up-due prospect into a real row, keeping which cadence action is actually due", () => {
    const followUps: FollowUpDue[] = [{ id: "p1", businessName: "Acme", nextAction: "call" }];
    const items = computeActionQueue(followUps, [], [], [], "2026-08-31");
    expect(items).toEqual([{ id: "p1", kind: "follow_up", businessName: "Acme", detail: "Due a call", href: "/studio/prospects" }]);
  });

  it("says 'one more follow-up' rather than 'call' for the email-cadence outcome", () => {
    const followUps: FollowUpDue[] = [{ id: "p1", businessName: "Acme", nextAction: "follow_up" }];
    const items = computeActionQueue(followUps, [], [], [], "2026-08-31");
    expect(items[0].detail).toBe("Due one more follow-up");
  });

  it("includes an unanswered request, truncated, but skips one already responded to", () => {
    const clients = [{ id: "c1", business_name: "Acme" }];
    const requests = [
      { id: "r1", client_id: "c1", raw_text: "a".repeat(200), responded_at: null },
      { id: "r2", client_id: "c1", raw_text: "Already handled", responded_at: "2026-08-20T00:00:00Z" },
    ];
    const items = computeActionQueue([], requests, [], clients, "2026-08-31");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "r1", kind: "unanswered_request", businessName: "Acme", href: "/studio/requests" });
    expect(items[0].detail.length).toBeLessThanOrEqual(70);
    expect(items[0].detail.endsWith("…")).toBe(true);
  });

  it("includes an active project past its target date, but skips one that's done or not yet due", () => {
    const clients = [{ id: "c1", business_name: "Acme" }];
    const projects = [
      { id: "proj1", client_id: "c1", name: "Website redesign", status: "active", target_date: "2026-08-01" },
      { id: "proj2", client_id: "c1", name: "Done already", status: "done", target_date: "2026-08-01" },
      { id: "proj3", client_id: "c1", name: "Not due yet", status: "active", target_date: "2026-09-15" },
      { id: "proj4", client_id: "c1", name: "No target date", status: "active", target_date: null },
    ];
    const items = computeActionQueue([], [], projects, clients, "2026-08-31");
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("proj1");
    expect(items[0].kind).toBe("overdue_project");
    expect(items[0].detail).toContain("Website redesign");
  });

  it("drops a request or project whose client isn't in the roster passed in, rather than showing a blank name", () => {
    const requests = [{ id: "r1", client_id: "ghost", raw_text: "Orphaned", responded_at: null }];
    const projects = [{ id: "p1", client_id: "ghost", name: "Orphaned project", status: "active", target_date: "2026-08-01" }];
    expect(computeActionQueue([], requests, [], [], "2026-08-31")).toEqual([]);
    expect(computeActionQueue([], [], projects, [], "2026-08-31")).toEqual([]);
  });

  it("caps the queue at 8 items even when more real things are due, follow-ups first", () => {
    const followUps: FollowUpDue[] = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, businessName: `P${i}`, nextAction: "follow_up" }));
    const clients = [{ id: "c1", business_name: "Acme" }];
    const requests = Array.from({ length: 5 }, (_, i) => ({ id: `r${i}`, client_id: "c1", raw_text: `Request ${i}`, responded_at: null }));
    const items = computeActionQueue(followUps, requests, [], clients, "2026-08-31");
    expect(items).toHaveLength(8);
    expect(items.filter((i) => i.kind === "follow_up")).toHaveLength(5);
    expect(items.filter((i) => i.kind === "unanswered_request")).toHaveLength(3);
  });
});
