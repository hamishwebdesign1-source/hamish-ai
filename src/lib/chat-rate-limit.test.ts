import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
const getSupabaseAdminMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}));

beforeEach(() => {
  vi.resetModules();
  rpcMock.mockReset();
  getSupabaseAdminMock.mockReset();
  getSupabaseAdminMock.mockReturnValue({ rpc: rpcMock });
});

describe("isRateLimited", () => {
  it("is not rate limited when the Postgres function says the request is allowed", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    const { isRateLimited } = await import("./chat-rate-limit");

    expect(await isRateLimited("some-key")).toBe(false);
    expect(rpcMock).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "some-key",
      p_window_seconds: 600,
      p_max_requests: 20,
    });
  });

  it("is rate limited when the Postgres function says the request is not allowed", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    const { isRateLimited } = await import("./chat-rate-limit");

    expect(await isRateLimited("some-key")).toBe(true);
  });

  it("fails open (allows the request) if the database call errors", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "connection refused" } });
    const { isRateLimited } = await import("./chat-rate-limit");

    expect(await isRateLimited("some-key")).toBe(false);
  });

  it("falls back to an in-memory limiter if Supabase isn't configured", async () => {
    getSupabaseAdminMock.mockReturnValue(null);
    const { isRateLimited } = await import("./chat-rate-limit");

    for (let i = 0; i < 20; i++) {
      expect(await isRateLimited("fallback-key")).toBe(false);
    }
    // The 21st request within the window should trip the fallback limiter.
    expect(await isRateLimited("fallback-key")).toBe(true);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

// Pricing-promise audit (2026-09-02) — locks in the plan-aware burst
// allowance that replaced Agency's old "priority research queue" bullet
// (there was no queue anywhere in this codebase for "priority" to mean
// anything within — see chat-rate-limit.ts's own comment).
describe("isStudioActionRateLimited", () => {
  it("uses the flat 15-request budget when no plan is passed", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    const { isStudioActionRateLimited } = await import("./chat-rate-limit");

    await isStudioActionRateLimited("org-1");
    expect(rpcMock).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "studio-ai:org-1",
      p_window_seconds: 300,
      p_max_requests: 15,
    });
  });

  it("uses the flat 15-request budget for starter/professional", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    const { isStudioActionRateLimited } = await import("./chat-rate-limit");

    await isStudioActionRateLimited("org-1", "professional");
    expect(rpcMock).toHaveBeenCalledWith("check_rate_limit", expect.objectContaining({ p_max_requests: 15 }));
  });

  it("doubles the burst budget to 30 requests for the agency plan", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    const { isStudioActionRateLimited } = await import("./chat-rate-limit");

    await isStudioActionRateLimited("org-1", "agency");
    expect(rpcMock).toHaveBeenCalledWith("check_rate_limit", expect.objectContaining({ p_max_requests: 30 }));
  });
});
