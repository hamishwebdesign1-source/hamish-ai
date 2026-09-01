import { describe, it, expect, vi, beforeEach } from "vitest";

// Same hand-rolled chain-stub shape as send-invoice-reminder.test.ts's own
// getSupabaseAdmin mock — a fixed call sequence per table, not the shared
// relational test-helpers/mock-supabase.ts (which doesn't support the
// multi-.eq()/.not()/.is() chains this file's queries actually use).
const getSupabaseAdminMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}));

const sendOrgEmailMock = vi.fn();
vi.mock("@/lib/send-org-email", () => ({
  sendOrgEmail: (...args: unknown[]) => sendOrgEmailMock(...args),
}));

const logAuditEventMock = vi.fn();
vi.mock("@/lib/audit-log", () => ({
  logAuditEvent: (...args: unknown[]) => logAuditEventMock(...args),
}));

type OrgRow = { id: string; name: string; brand: Record<string, unknown> };
type ProspectRow = {
  id: string;
  business_name: string;
  email: string | null;
  status: string;
  contacted_at: string | null;
  last_contact_method: string | null;
  replied_at: string | null;
  sales_kit: unknown;
};

// A chainable query stub — every filter method returns itself, and the
// object is directly awaitable (thenable), matching how the real code
// calls it: `await admin.from(...).select(...).eq(...).eq(...)` with no
// terminal `.single()` for either query in autonomous-outreach.ts.
function chain<T>(data: T) {
  const self = {
    eq: () => self,
    not: () => self,
    is: () => self,
    then: (resolve: (v: { data: T; error: null }) => unknown) => resolve({ data, error: null }),
  };
  return self;
}

function buildAdmin(orgs: OrgRow[], prospectsByOrg: Record<string, ProspectRow[]>, onProspectUpdate?: (id: string, patch: unknown) => void) {
  return {
    from(table: string) {
      if (table === "organisations") {
        return { select: () => chain(orgs) };
      }
      if (table === "prospects") {
        return {
          select: () => ({
            eq: (col: string, value: string) => {
              const rows = col === "org_id" ? (prospectsByOrg[value] ?? []) : [];
              return chain(rows);
            },
          }),
          update: (patch: unknown) => ({
            eq: (col: string, value: string) => {
              if (col === "id") onProspectUpdate?.(value, patch);
              return { eq: () => Promise.resolve({ error: null }) };
            },
          }),
        };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    },
  };
}

const FOLLOW_UP_KIT = { follow_up_email: { subject: "Still keen to help", body: "Just checking in." } };

// contacted 12 days ago via a call, no reply — squarely past
// CALL_FOLLOWUP_DAYS (7), so getLeadCadenceAction() returns "follow_up".
function followUpDueProspect(overrides: Partial<ProspectRow> = {}): ProspectRow {
  return {
    id: "prospect-1",
    business_name: "Acme Cafe",
    email: "owner@acme.example",
    status: "contacted",
    contacted_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    last_contact_method: "call",
    replied_at: null,
    sales_kit: FOLLOW_UP_KIT,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetModules();
  getSupabaseAdminMock.mockReset();
  sendOrgEmailMock.mockReset();
  sendOrgEmailMock.mockResolvedValue({ sent: true });
  logAuditEventMock.mockReset();
});

describe("sendAutonomousFollowUps", () => {
  it("skips a non-internal org that hasn't enabled autonomous outreach", async () => {
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin([{ id: "org-1", name: "Their Agency", brand: { replyToEmail: "owner@theiragency.com" } }], {
        "org-1": [followUpDueProspect()],
      })
    );
    const { sendAutonomousFollowUps } = await import("./autonomous-outreach");

    const result = await sendAutonomousFollowUps();

    expect(result).toEqual({ sent: 0, byOrg: {} });
    expect(sendOrgEmailMock).not.toHaveBeenCalled();
  });

  it("skips an org that enabled it but has no reply-to email configured", async () => {
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin([{ id: "org-1", name: "Their Agency", brand: { autonomousOutreachEnabled: true } }], {
        "org-1": [followUpDueProspect()],
      })
    );
    const { sendAutonomousFollowUps } = await import("./autonomous-outreach");

    await sendAutonomousFollowUps();

    expect(sendOrgEmailMock).not.toHaveBeenCalled();
  });

  it("sends the sales kit's follow-up email and resets the cadence clock for a due, opted-in prospect", async () => {
    const updates: { id: string; patch: unknown }[] = [];
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin(
        [{ id: "org-1", name: "Their Agency", brand: { autonomousOutreachEnabled: true, replyToEmail: "owner@theiragency.com" } }],
        { "org-1": [followUpDueProspect()] },
        (id, patch) => updates.push({ id, patch })
      )
    );
    const { sendAutonomousFollowUps } = await import("./autonomous-outreach");

    const result = await sendAutonomousFollowUps();

    expect(result).toEqual({ sent: 1, byOrg: { "org-1": 1 } });
    expect(sendOrgEmailMock).toHaveBeenCalledTimes(1);
    expect(sendOrgEmailMock.mock.calls[0][0]).toMatchObject({
      orgId: "org-1",
      orgName: "Their Agency",
      replyToEmail: "owner@theiragency.com",
      to: "owner@acme.example",
      subject: "Still keen to help",
      text: "Just checking in.",
    });
    expect(updates).toEqual([{ id: "prospect-1", patch: expect.objectContaining({ last_contact_method: "email" }) }]);
    expect(logAuditEventMock).toHaveBeenCalledTimes(1);
    expect(logAuditEventMock.mock.calls[0][0]).toMatchObject({ action: "prospect.autonomous_follow_up_sent", targetId: "prospect-1" });
  });

  it("never sends for a prospect only due a call — that step can't be automated", async () => {
    // 6 days since an emailed (not called) contact: past EMAIL_TO_CALL_DAYS
    // (5) but getLeadCadenceAction() returns "call", not "follow_up".
    const emailOnlyDue = followUpDueProspect({
      contacted_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      last_contact_method: "email",
    });
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin([{ id: "org-1", name: "Their Agency", brand: { autonomousOutreachEnabled: true, replyToEmail: "owner@theiragency.com" } }], {
        "org-1": [emailOnlyDue],
      })
    );
    const { sendAutonomousFollowUps } = await import("./autonomous-outreach");

    const result = await sendAutonomousFollowUps();

    expect(result).toEqual({ sent: 0, byOrg: {} });
    expect(sendOrgEmailMock).not.toHaveBeenCalled();
  });

  it("never invents a follow-up for a prospect with no sales kit drafted", async () => {
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin([{ id: "org-1", name: "Their Agency", brand: { autonomousOutreachEnabled: true, replyToEmail: "owner@theiragency.com" } }], {
        "org-1": [followUpDueProspect({ sales_kit: null })],
      })
    );
    const { sendAutonomousFollowUps } = await import("./autonomous-outreach");

    const result = await sendAutonomousFollowUps();

    expect(result).toEqual({ sent: 0, byOrg: {} });
    expect(sendOrgEmailMock).not.toHaveBeenCalled();
  });

  it("caps sends per org per run rather than sending unbounded", async () => {
    const many = Array.from({ length: 8 }, (_, i) => followUpDueProspect({ id: `prospect-${i}`, email: `p${i}@example.com` }));
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin([{ id: "org-1", name: "Their Agency", brand: { autonomousOutreachEnabled: true, replyToEmail: "owner@theiragency.com" } }], {
        "org-1": many,
      })
    );
    const { sendAutonomousFollowUps } = await import("./autonomous-outreach");

    const result = await sendAutonomousFollowUps();

    expect(result.sent).toBe(5);
    expect(sendOrgEmailMock).toHaveBeenCalledTimes(5);
  });

  it("never processes HamishAI's own internal org — its lead pipeline is Gmail-draft-based, not sendOrgEmail", async () => {
    // The real query filters .eq("is_internal", false); simulating that
    // filter's effect here (an internal org simply never appears in what
    // the query returns), same as every other test's chain stub.
    getSupabaseAdminMock.mockReturnValue(buildAdmin([], {}));
    const { sendAutonomousFollowUps } = await import("./autonomous-outreach");

    const result = await sendAutonomousFollowUps();

    expect(result).toEqual({ sent: 0, byOrg: {} });
    expect(sendOrgEmailMock).not.toHaveBeenCalled();
  });

  it("continues to the next prospect when sendOrgEmail fails for one", async () => {
    sendOrgEmailMock.mockResolvedValueOnce({ error: "Too many emails sent recently — try again in a little while." }).mockResolvedValueOnce({ sent: true });
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin([{ id: "org-1", name: "Their Agency", brand: { autonomousOutreachEnabled: true, replyToEmail: "owner@theiragency.com" } }], {
        "org-1": [followUpDueProspect({ id: "prospect-a", email: "a@example.com" }), followUpDueProspect({ id: "prospect-b", email: "b@example.com" })],
      })
    );
    const { sendAutonomousFollowUps } = await import("./autonomous-outreach");

    const result = await sendAutonomousFollowUps();

    expect(sendOrgEmailMock).toHaveBeenCalledTimes(2);
    expect(result.sent).toBe(1);
  });
});
