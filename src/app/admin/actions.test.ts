import { describe, it, expect, vi, beforeEach } from "vitest";

// Bumped from the 5s default — Security Auditor flagged this file as
// timing out in isolation only under full-suite parallel load (never a
// logic failure; every test here passes clean run alone or with fewer
// workers). Reproduced again in round 2 of docs/ai-team's P0 /admin
// org-isolation fix (added 6 more tests to this same file), same
// symptom — real housekeeping fix rather than leaving it to keep flaking.
vi.setConfig({ testTimeout: 15000 });

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

const sendInvoiceReminderMock = vi.fn();
vi.mock("@/lib/send-invoice-reminder", () => ({
  sendInvoiceReminder: (...args: unknown[]) => sendInvoiceReminderMock(...args),
}));

const regenerateDraftResponseMock = vi.fn();
vi.mock("@/lib/triage-request", () => ({
  regenerateDraftResponse: (...args: unknown[]) => regenerateDraftResponseMock(...args),
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
  sendInvoiceReminderMock.mockReset();
  regenerateDraftResponseMock.mockReset();
});

// A dedicated minimal fake for the sendInvoiceReminderAction case — its
// ownership check joins through clients!inner(org_id) rather than a plain
// org_id column (invoices.org_id isn't reliably set on every insert path,
// same real gap studio's own sendClientInvoiceReminderAction() already
// documents), so it needs its own select().eq().eq().single() shape
// distinct from fakeSupabase()'s generic one above.
function fakeSupabaseForInvoiceLookup(ownershipResult: { data: unknown; error: unknown }) {
  const single = vi.fn(() => Promise.resolve(ownershipResult));
  const eq2 = vi.fn(() => ({ single }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const select = vi.fn(() => ({ eq: eq1 }));
  const from = vi.fn(() => ({ select }));
  return { from, _select: select };
}

// A dedicated minimal fake for deleteKnowledgeEntry — its delete call
// chains two .eq()s (id, then org_id) rather than fakeSupabase()'s
// single-.eq() delete shape (removeClientMember only needs one).
function fakeSupabaseForKnowledgeDelete(ownershipResult: { data: unknown; error: unknown }) {
  const single = vi.fn(() => Promise.resolve(ownershipResult));
  const selectEq2 = vi.fn(() => ({ single }));
  const selectEq1 = vi.fn(() => ({ eq: selectEq2 }));
  const select = vi.fn(() => ({ eq: selectEq1 }));

  const deleteEq2 = vi.fn(() => Promise.resolve({ error: null }));
  const deleteEq1 = vi.fn(() => ({ eq: deleteEq2 }));
  const del = vi.fn(() => ({ eq: deleteEq1 }));

  const from = vi.fn(() => ({ select, delete: del }));
  return { from, _select: select, _delete: del };
}

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

  // Round 2 of this fix (docs/ai-team's P0 /admin org-isolation fix) —
  // covers the write-side gaps Security Auditor's review found missing
  // from round 1: knowledge_base deletion, invoice reminders, and the
  // three `requests` mutations that were relying only on the page-level
  // read gate, not their own independently-invokable ownership check.
  it("deleteKnowledgeEntry never deletes an entry belonging to another org", async () => {
    const fake = fakeSupabaseForKnowledgeDelete({ data: null, error: null });
    getSupabaseAdminMock.mockReturnValue(fake);
    const { deleteKnowledgeEntry } = await import("./actions");

    await deleteKnowledgeEntry("entry-owned-by-org-b");

    expect(fake._delete).not.toHaveBeenCalled();
  });

  it("deleteKnowledgeEntry deletes an entry once ownership is confirmed", async () => {
    const fake = fakeSupabaseForKnowledgeDelete({ data: { id: "entry-1" }, error: null });
    getSupabaseAdminMock.mockReturnValue(fake);
    const { deleteKnowledgeEntry } = await import("./actions");

    await deleteKnowledgeEntry("entry-owned-by-hamishai");

    expect(fake._delete).toHaveBeenCalledTimes(1);
  });

  it("sendInvoiceReminderAction never sends a reminder for an invoice belonging to another org's client, and never calls sendInvoiceReminder", async () => {
    const fake = fakeSupabaseForInvoiceLookup({ data: null, error: null });
    getSupabaseAdminMock.mockReturnValue(fake);
    const { sendInvoiceReminderAction } = await import("./actions");

    await sendInvoiceReminderAction("invoice-owned-by-org-b-client", "/admin/clients/some-id");

    expect(sendInvoiceReminderMock).not.toHaveBeenCalled();
  });

  it("updateDraftResponse never updates a request belonging to another org", async () => {
    const fake = fakeSupabase({ data: null, error: null });
    getSupabaseAdminMock.mockReturnValue(fake);
    const { updateDraftResponse } = await import("./actions");

    const formData = new FormData();
    formData.set("draft_response", "a reply");
    await updateDraftResponse("request-owned-by-org-b", formData);

    expect(fake._update).not.toHaveBeenCalled();
  });

  it("regenerateAdminDraft never regenerates a draft for a request belonging to another org, and never calls the AI pipeline", async () => {
    const fake = fakeSupabase({ data: null, error: null });
    getSupabaseAdminMock.mockReturnValue(fake);
    const { regenerateAdminDraft } = await import("./actions");

    await regenerateAdminDraft("request-owned-by-org-b");

    expect(regenerateDraftResponseMock).not.toHaveBeenCalled();
    expect(fake._update).not.toHaveBeenCalled();
  });

  it("reviewAutoSend never records a review for a request belonging to another org", async () => {
    const fake = fakeSupabase({ data: null, error: null });
    getSupabaseAdminMock.mockReturnValue(fake);
    const { reviewAutoSend } = await import("./actions");

    await reviewAutoSend("request-owned-by-org-b", true, "/admin/audit");

    expect(fake._update).not.toHaveBeenCalled();
  });
});
