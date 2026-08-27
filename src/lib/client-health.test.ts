import { describe, it, expect } from "vitest";
import { computeClientHealth, computeAgencyHealth, type HealthInvoiceRow } from "./client-health";

describe("computeClientHealth", () => {
  it("returns a null score with no components when there's no real data at all", () => {
    expect(computeClientHealth([], [], [], [])).toEqual({ healthScore: null, components: [] });
  });

  it("computes uptime only from checks that actually resolved (ignores null uptime_ok)", () => {
    const result = computeClientHealth([], [], [], [{ uptime_ok: true }, { uptime_ok: true }, { uptime_ok: false }, { uptime_ok: null }]);
    const uptime = result.components.find((c) => c.label === "Site uptime");
    expect(uptime?.value).toBe(67); // 2 of 3 resolved checks, null excluded
  });

  it("counts an invoice on-time only when paid_at is on or before its due_date's end of day", () => {
    const invoices: HealthInvoiceRow[] = [
      { status: "paid", due_date: "2026-01-10", paid_at: "2026-01-10T23:59:59" }, // exactly on time
      { status: "paid", due_date: "2026-01-10", paid_at: "2026-01-11T00:00:01" }, // one second late
      { status: "sent", due_date: "2026-01-10", paid_at: null }, // not paid - excluded entirely
    ];
    const result = computeClientHealth([], [], invoices, []);
    const onTime = result.components.find((c) => c.label === "On-time payment");
    expect(onTime?.value).toBe(50); // 1 of the 2 actually-paid invoices
  });

  it("treats an invoice paid with no due_date as always on time", () => {
    const invoices: HealthInvoiceRow[] = [{ status: "paid", due_date: null, paid_at: "2026-01-10T00:00:00" }];
    const result = computeClientHealth([], [], invoices, []);
    expect(result.components.find((c) => c.label === "On-time payment")?.value).toBe(100);
  });

  it("computes completion as the share of tasks marked done", () => {
    const result = computeClientHealth(
      [],
      [
        { id: "1", request_id: null, status: "done" },
        { id: "2", request_id: null, status: "done" },
        { id: "3", request_id: null, status: "todo" },
        { id: "4", request_id: null, status: "in_progress" },
      ],
      [],
      []
    );
    expect(result.components.find((c) => c.label === "Work completed")?.value).toBe(50);
  });

  it("computes responsiveness as the share of requests NOT stuck awaiting_info", () => {
    const result = computeClientHealth(
      [
        { id: "1", status: "new" },
        { id: "2", status: "in_progress" },
        { id: "3", status: "awaiting_info" },
      ],
      [],
      [],
      []
    );
    expect(result.components.find((c) => c.label === "Requests moving")?.value).toBe(67);
  });

  it("averages only the components that actually have real data, excluding null ones", () => {
    // Only tasks data exists (100% complete) - the other three components
    // have no data and must be excluded from both the list and the average,
    // not silently treated as 0.
    const result = computeClientHealth([], [{ id: "1", request_id: null, status: "done" }], [], []);
    expect(result.components).toHaveLength(1);
    expect(result.healthScore).toBe(100);
  });
});

describe("computeAgencyHealth", () => {
  it("adds a real pipeline-conversion dimension client health doesn't have", () => {
    const result = computeAgencyHealth({ requests: [], tasks: [], invoices: [], siteChecks: [], prospectCount: 20, clientCount: 5 });
    expect(result.components.find((c) => c.label === "Pipeline conversion")?.value).toBe(25);
  });

  it("omits pipeline conversion entirely when there have never been any prospects", () => {
    const result = computeAgencyHealth({ requests: [], tasks: [], invoices: [], siteChecks: [], prospectCount: 0, clientCount: 0 });
    expect(result.components.find((c) => c.label === "Pipeline conversion")).toBeUndefined();
    expect(result.healthScore).toBeNull();
  });

  it("uses the exact same underlying math as computeClientHealth for the four shared components", () => {
    const siteChecks = [{ uptime_ok: true }, { uptime_ok: false }];
    const clientResult = computeClientHealth([], [], [], siteChecks);
    const agencyResult = computeAgencyHealth({ requests: [], tasks: [], invoices: [], siteChecks, prospectCount: 0, clientCount: 0 });
    expect(agencyResult.components.find((c) => c.label === "Client sites uptime")?.value).toBe(
      clientResult.components.find((c) => c.label === "Site uptime")?.value
    );
  });
});
