import { describe, it, expect, vi, beforeEach } from "vitest";

// revalidatePath() throws ("Invariant: static generation store missing")
// outside of a real Next.js request context — same reason
// studio/(authed)/clients/actions.test.ts mocks it.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const getSupabaseAdminMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}));

const logAuditEventMock = vi.fn();
vi.mock("@/lib/audit-log", () => ({
  logAuditEvent: (...args: unknown[]) => logAuditEventMock(...args),
}));

const createTeamsMeetingMock = vi.fn();
vi.mock("@/lib/teams-meeting", () => ({
  createTeamsMeeting: (...args: unknown[]) => createTeamsMeetingMock(...args),
  findAvailableSlots: vi.fn(),
}));

// Minimal fake covering exactly the two call shapes every ownership check
// added by the P0 /admin org-isolation fix uses:
//   .from(table).select(...).eq("id", id).eq("org_id"|"clients.org_id", HAMISHAI_ORG_ID).single()
// and, once ownership is confirmed, .from(table).update(...).eq("id", id).eq("org_id", HAMISHAI_ORG_ID)
// / .delete().eq("id", id) / .eq("org_id", HAMISHAI_ORG_ID) — same
// deliberately-minimal "mock exactly the calls this action makes"
// approach as studio/(authed)/clients/actions.test.ts's adminReturning(),
// not a general Server-Action test harness.
function fakeSupabase(ownershipResult: { data: unknown; error: unknown }) {
  const single = vi.fn(() => Promise.resolve(ownershipResult));
  const selectEq2 = vi.fn(() => ({ single }));
  const selectEq1 = vi.fn(() => ({ eq: selectEq2 }));
  const select = vi.fn(() => ({ eq: selectEq1 }));

  const updateEq2 = vi.fn(() => Promise.resolve({ error: null }));
  const updateEq1 = vi.fn(() => ({ eq: updateEq2 }));
  const update = vi.fn(() => ({ eq: updateEq1 }));

  const deleteEq = vi.fn(() => Promise.resolve({ error: null }));
  const del = vi.fn(() => ({ eq: deleteEq }));

  const from = vi.fn(() => ({ select, update, delete: del }));
  return { from, _select: select, _update: update, _delete: del, _updateEq1: updateEq1 };
}

beforeEach(() => {
  getSupabaseAdminMock.mockReset();
  logAuditEventMock.mockReset();
  createTeamsMeetingMock.mockReset();
});

// These four cover one representative case from each shape the fix
// touched: a plain prospect update, a prospect action that also triggers a
// real external side effect (Teams), a plain client update, and a
// client_members ownership check that has to join through clients (no
// org_id column of its own). Not exhaustive of all ~20 fixed actions —
// matching this codebase's own "a few focused tests on the pattern" effort
// level (no pre-existing /admin test file to extend; this is the first).
describe("/admin write actions — HAMISHAI_ORG_ID ownership checks", () => {
  it("updateLeadStatus never updates a lead belonging to another org", async () => {
    const fake = fakeSupabase({ data: null, error: null });
    getSupabaseAdminMock.mockReturnValue(fake);
    const { updateLeadStatus } = await import("./actions");

    await updateLeadStatus("lead-owned-by-org-b", "contacted");

    expect(fake._update).not.toHaveBeenCalled();
    expect(logAuditEventMock).not.toHaveBeenCalled();
  });

  it("updateLeadStatus updates a lead once ownership is confirmed", async () => {
    const fake = fakeSupabase({ data: { status: "needs_verification" }, error: null });
    getSupabaseAdminMock.mockReturnValue(fake);
    const { updateLeadStatus } = await import("./actions");

    await updateLeadStatus("lead-owned-by-hamishai", "contacted");

    expect(fake._update).toHaveBeenCalledTimes(1);
  });

  it("scheduleLeadMeeting rejects a lead belonging to another org as 'not found', and never calls the Teams API", async () => {
    const fake = fakeSupabase({ data: null, error: null });
    getSupabaseAdminMock.mockReturnValue(fake);
    const { scheduleLeadMeeting } = await import("./actions");

    const result = await scheduleLeadMeeting("lead-owned-by-org-b", "2026-09-08T10:00", "2026-09-08T10:30");

    expect(result).toEqual({ error: "Lead not found." });
    expect(createTeamsMeetingMock).not.toHaveBeenCalled();
  });

  it("updateClientStatus never updates a client belonging to another org", async () => {
    const fake = fakeSupabase({ data: null, error: null });
    getSupabaseAdminMock.mockReturnValue(fake);
    const { updateClientStatus } = await import("./actions");

    await updateClientStatus("client-owned-by-org-b", "paused", "/admin/clients/client-owned-by-org-b");

    expect(fake._update).not.toHaveBeenCalled();
    expect(logAuditEventMock).not.toHaveBeenCalled();
  });

  it("removeClientMember never deletes a member of a client belonging to another org", async () => {
    const fake = fakeSupabase({ data: null, error: null });
    getSupabaseAdminMock.mockReturnValue(fake);
    const { removeClientMember } = await import("./actions");

    await removeClientMember("member-of-org-b-client", "/admin/clients/some-id");

    expect(fake._delete).not.toHaveBeenCalled();
    expect(logAuditEventMock).not.toHaveBeenCalled();
  });
});
