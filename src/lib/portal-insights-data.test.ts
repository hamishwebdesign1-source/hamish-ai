import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createMockSupabase } from "./test-helpers/mock-supabase";
import { buildPortalInsights } from "./portal-insights-data";

// This file exists because a silent bug here means one client sees another
// client's numbers — the highest-risk file in the portal per the Phase 0
// roadmap. Every test below either proves a specific number is computed
// correctly from known input, or proves client A's data never leaks into
// client B's result.

const NOW = new Date("2026-08-05T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("buildPortalInsights", () => {
  it("returns an error for a client id that doesn't exist", async () => {
    const supabase = createMockSupabase({ clients: [] });
    const result = await buildPortalInsights(supabase as never, "missing-client");
    expect(result).toEqual({ error: "Client not found." });
  });

  it("returns honest empty defaults for a client with no activity yet", async () => {
    const supabase = createMockSupabase({
      clients: [{ id: "client-empty", business_name: "New Co", website_url: null }],
      requests: [],
      tasks: [],
      invoices: [],
      site_checks: [],
    });

    const result = await buildPortalInsights(supabase as never, "client-empty");
    if ("error" in result) throw new Error("expected success");

    expect(result.healthScore).toBeNull();
    expect(result.components).toEqual([]);
    expect(result.funnel).toEqual([
      { label: "Requests submitted", value: 0 },
      { label: "Became real work", value: 0 },
      { label: "Work finished", value: 0 },
    ]);
    expect(result.categoryBreakdown).toEqual([]);
    expect(result.automationEvents).toEqual([]);
    expect(result.totalRequests).toBe(0);
    expect(result.totalPaid).toBe(0);
    expect(result.uptimePct).toBeNull();
    expect(result.requestsByMonth.every((m) => m.value === 0)).toBe(true);
    expect(result.insights).toEqual([
      { id: "none-yet", category: "trend", text: "Not enough activity yet to surface a pattern — check back after a few more requests." },
    ]);
  });

  it("computes health score, funnel, categories and insights correctly from realistic data", async () => {
    const supabase = createMockSupabase({
      clients: [{ id: "client-1", business_name: "Acme Ltd", website_url: "https://acme.example.com" }],
      requests: [
        { id: "r1", client_id: "client-1", created_at: "2026-08-15T09:00:00Z", status: "triaged", category: "bug", auto_sent: true, responded_at: "2026-08-15T09:05:00Z" },
        { id: "r2", client_id: "client-1", created_at: "2026-08-14T09:00:00Z", status: "triaged", category: "feature", auto_sent: false, responded_at: null },
        { id: "r3", client_id: "client-1", created_at: "2026-08-13T09:00:00Z", status: "new", category: "bug", auto_sent: false, responded_at: null },
        { id: "r4", client_id: "client-1", created_at: "2026-08-12T09:00:00Z", status: "awaiting_info", category: "question", auto_sent: false, responded_at: null },
      ],
      tasks: [
        { id: "t1", request_id: "r1", status: "done", created_at: "2026-08-15T10:00:00Z" },
        { id: "t2", request_id: "r1", status: "done", created_at: "2026-08-15T11:00:00Z" },
        { id: "t3", request_id: "r2", status: "done", created_at: "2026-08-14T10:00:00Z" },
        { id: "t4", request_id: "r2", status: "in_progress", created_at: "2026-08-14T11:00:00Z" },
      ],
      invoices: [
        { client_id: "client-1", amount_pence: 10000, status: "paid", due_date: "2026-08-10", paid_at: "2026-08-09T10:00:00", created_at: "2026-08-01T09:00:00Z" },
        { client_id: "client-1", amount_pence: 5000, status: "paid", due_date: "2026-08-10", paid_at: "2026-08-12T10:00:00", created_at: "2026-08-02T09:00:00Z" },
        { client_id: "client-1", amount_pence: 7500, status: "pending", due_date: "2026-08-20", paid_at: null, created_at: "2026-08-03T09:00:00Z" },
      ],
      site_checks: [
        { client_id: "client-1", checked_at: "2026-08-15T06:00:00Z", uptime_ok: true, response_ms: 200 },
        { client_id: "client-1", checked_at: "2026-08-14T06:00:00Z", uptime_ok: true, response_ms: 210 },
        { client_id: "client-1", checked_at: "2026-08-13T06:00:00Z", uptime_ok: true, response_ms: 190 },
        { client_id: "client-1", checked_at: "2026-08-12T06:00:00Z", uptime_ok: false, response_ms: null },
      ],
    });

    const result = await buildPortalInsights(supabase as never, "client-1");
    if ("error" in result) throw new Error("expected success");

    // Health score components: uptime 3/4=75%, on-time 1/2=50%, tasks 3/4=75%, requests 3/4=75%
    expect(result.uptimePct).toBe(75);
    expect(result.components).toEqual(
      expect.arrayContaining([
        { label: "Site uptime", value: 75 },
        { label: "On-time payment", value: 50 },
        { label: "Work completed", value: 75 },
        { label: "Requests moving", value: 75 },
      ])
    );
    expect(result.healthScore).toBe(69); // average(75,50,75,75) = 68.75 -> 69

    expect(result.funnel).toEqual([
      { label: "Requests submitted", value: 4 },
      { label: "Became real work", value: 2 },
      { label: "Work finished", value: 1 },
    ]);

    expect(result.categoryBreakdown).toEqual([
      { category: "bug", label: "Bug fixes", value: 2 },
      { category: "feature", label: "New features", value: 1 },
      { category: "question", label: "Questions", value: 1 },
    ]);

    expect(result.totalRequests).toBe(4);
    expect(result.totalPaid).toBe(150); // (10000 + 5000) / 100
    expect(result.autoReplyCount).toBe(1);
    expect(result.needsInputCount).toBe(1);

    const insightIds = result.insights.map((i) => i.id);
    expect(insightIds).toEqual(["needs-input", "uptime", "automation"]);
  });

  it("never leaks another client's rows into this client's result", async () => {
    const supabase = createMockSupabase({
      clients: [
        { id: "client-a", business_name: "Client A", website_url: "https://a.example.com" },
        { id: "client-b", business_name: "Client B", website_url: "https://b.example.com" },
      ],
      requests: [
        { id: "a1", client_id: "client-a", created_at: "2026-08-15T09:00:00Z", status: "new", category: "bug", auto_sent: false, responded_at: null },
        { id: "b1", client_id: "client-b", created_at: "2026-08-15T09:00:00Z", status: "new", category: "feature", auto_sent: false, responded_at: null },
        { id: "b2", client_id: "client-b", created_at: "2026-08-14T09:00:00Z", status: "new", category: "feature", auto_sent: false, responded_at: null },
      ],
      tasks: [],
      invoices: [
        { client_id: "client-a", amount_pence: 1000, status: "paid", due_date: "2026-08-01", paid_at: "2026-07-30T10:00:00", created_at: "2026-07-29T09:00:00Z" },
        { client_id: "client-b", amount_pence: 999999, status: "paid", due_date: "2026-08-01", paid_at: "2026-07-30T10:00:00", created_at: "2026-07-29T09:00:00Z" },
      ],
      site_checks: [],
    });

    const resultA = await buildPortalInsights(supabase as never, "client-a");
    if ("error" in resultA) throw new Error("expected success");

    expect(resultA.client.business_name).toBe("Client A");
    expect(resultA.totalRequests).toBe(1);
    expect(resultA.totalPaid).toBe(10); // must not include client B's £9999.99 invoice

    const resultB = await buildPortalInsights(supabase as never, "client-b");
    if ("error" in resultB) throw new Error("expected success");

    expect(resultB.client.business_name).toBe("Client B");
    expect(resultB.totalRequests).toBe(2);
  });
});
