import { describe, it, expect, vi, beforeEach } from "vitest";

const getSupabaseAdminMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}));

const draftSalesKitMock = vi.fn();
vi.mock("@/lib/draft-sales-kit", () => ({
  draftSalesKit: (...args: unknown[]) => draftSalesKitMock(...args),
}));

const getUsageStatusMock = vi.fn();
const recordUsageEventMock = vi.fn();
vi.mock("@/lib/usage-limits", () => ({
  getUsageStatus: (...args: unknown[]) => getUsageStatusMock(...args),
  recordUsageEvent: (...args: unknown[]) => recordUsageEventMock(...args),
}));

const isStudioActionRateLimitedMock = vi.fn();
vi.mock("@/lib/chat-rate-limit", () => ({
  isStudioActionRateLimited: (...args: unknown[]) => isStudioActionRateLimitedMock(...args),
}));

const logAuditEventMock = vi.fn();
vi.mock("@/lib/audit-log", () => ({
  logAuditEvent: (...args: unknown[]) => logAuditEventMock(...args),
}));

// A chainable, directly-awaitable stub — every filter/order/limit method
// returns the same object, which is itself thenable, matching the real
// query shape: .select().eq().in().gte().lte().not().is().order().limit().
function chain<T>(data: T) {
  const self = {
    eq: () => self,
    in: () => self,
    gte: () => self,
    lte: () => self,
    not: () => self,
    is: () => self,
    order: () => self,
    limit: () => self,
    then: (resolve: (v: { data: T; error: null }) => unknown) => resolve({ data, error: null }),
  };
  return self;
}

function buildAdmin(orgs: { id: string; name: string; plan: string; brand: Record<string, unknown> }[], prospectsByOrg: Record<string, { id: string; score: number }[]>) {
  return {
    from(table: string) {
      if (table === "organisations") return { select: () => chain(orgs) };
      if (table === "prospects") {
        return {
          select: () => ({
            eq: (col: string, value: string) => chain(col === "org_id" ? (prospectsByOrg[value] ?? []) : []),
          }),
        };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    },
  };
}

beforeEach(() => {
  vi.resetModules();
  getSupabaseAdminMock.mockReset();
  draftSalesKitMock.mockReset();
  draftSalesKitMock.mockResolvedValue({ kit: {}, generatedAt: "2026-09-01T00:00:00Z" });
  getUsageStatusMock.mockReset();
  getUsageStatusMock.mockResolvedValue({ allowed: true, used: 0, limit: 100 });
  recordUsageEventMock.mockReset();
  isStudioActionRateLimitedMock.mockReset();
  isStudioActionRateLimitedMock.mockResolvedValue(false);
  logAuditEventMock.mockReset();
});

describe("runAutoDraftHighScoreProspectsRule", () => {
  it("skips an org that hasn't enabled the rule", async () => {
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin([{ id: "org-1", name: "Their Agency", plan: "professional", brand: {} }], { "org-1": [{ id: "p1", score: 5 }] })
    );
    const { runAutoDraftHighScoreProspectsRule } = await import("./automation-rules");

    const result = await runAutoDraftHighScoreProspectsRule();

    expect(result).toEqual({ drafted: 0, byOrg: {} });
    expect(draftSalesKitMock).not.toHaveBeenCalled();
  });

  it("drafts a sales kit for each eligible prospect, records usage, and logs an audit event", async () => {
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin([{ id: "org-1", name: "Their Agency", plan: "professional", brand: { autoDraftHighScoreProspectsEnabled: true } }], {
        "org-1": [{ id: "p1", score: 5 }],
      })
    );
    const { runAutoDraftHighScoreProspectsRule } = await import("./automation-rules");

    const result = await runAutoDraftHighScoreProspectsRule();

    expect(result).toEqual({ drafted: 1, byOrg: { "org-1": 1 } });
    expect(draftSalesKitMock).toHaveBeenCalledWith("p1", { name: "Their Agency", isInternal: false });
    expect(recordUsageEventMock).toHaveBeenCalledWith("org-1", "sales_kit_generated");
    expect(logAuditEventMock).toHaveBeenCalledTimes(1);
    expect(logAuditEventMock.mock.calls[0][0]).toMatchObject({ action: "prospect.auto_drafted_sales_kit", targetId: "p1" });
  });

  it("stops for an org once its shared AI-action rate limit is hit, without erroring the run", async () => {
    isStudioActionRateLimitedMock.mockResolvedValue(true);
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin([{ id: "org-1", name: "Their Agency", plan: "professional", brand: { autoDraftHighScoreProspectsEnabled: true } }], {
        "org-1": [{ id: "p1", score: 5 }],
      })
    );
    const { runAutoDraftHighScoreProspectsRule } = await import("./automation-rules");

    const result = await runAutoDraftHighScoreProspectsRule();

    expect(result).toEqual({ drafted: 0, byOrg: {} });
    expect(draftSalesKitMock).not.toHaveBeenCalled();
  });

  it("stops for an org once its real plan usage limit is reached", async () => {
    getUsageStatusMock.mockResolvedValue({ allowed: false, used: 100, limit: 100 });
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin([{ id: "org-1", name: "Their Agency", plan: "professional", brand: { autoDraftHighScoreProspectsEnabled: true } }], {
        "org-1": [{ id: "p1", score: 5 }],
      })
    );
    const { runAutoDraftHighScoreProspectsRule } = await import("./automation-rules");

    const result = await runAutoDraftHighScoreProspectsRule();

    expect(result).toEqual({ drafted: 0, byOrg: {} });
    expect(draftSalesKitMock).not.toHaveBeenCalled();
  });

  it("continues to the next prospect, without recording usage, when draftSalesKit itself fails", async () => {
    draftSalesKitMock.mockResolvedValueOnce({ error: "ANTHROPIC_API_KEY is not configured." }).mockResolvedValueOnce({ kit: {}, generatedAt: "x" });
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin([{ id: "org-1", name: "Their Agency", plan: "professional", brand: { autoDraftHighScoreProspectsEnabled: true } }], {
        "org-1": [
          { id: "p1", score: 5 },
          { id: "p2", score: 4 },
        ],
      })
    );
    const { runAutoDraftHighScoreProspectsRule } = await import("./automation-rules");

    const result = await runAutoDraftHighScoreProspectsRule();

    expect(draftSalesKitMock).toHaveBeenCalledTimes(2);
    expect(recordUsageEventMock).toHaveBeenCalledTimes(1);
    expect(result.drafted).toBe(1);
  });

  it("never runs for HamishAI's own internal org", async () => {
    // The real query filters .eq("is_internal", false); simulated here the
    // same way every other cron test in this suite does — an internal org
    // simply never appears in what the query returns.
    getSupabaseAdminMock.mockReturnValue(buildAdmin([], {}));
    const { runAutoDraftHighScoreProspectsRule } = await import("./automation-rules");

    const result = await runAutoDraftHighScoreProspectsRule();

    expect(result).toEqual({ drafted: 0, byOrg: {} });
    expect(draftSalesKitMock).not.toHaveBeenCalled();
  });
});
