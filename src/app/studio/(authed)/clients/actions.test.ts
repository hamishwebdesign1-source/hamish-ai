import { describe, it, expect, vi, beforeEach } from "vitest";

// revalidatePath() throws ("Invariant: static generation store missing")
// outside of a real Next.js request context — this is the first test to
// call a mutating /studio Server Action directly, so the first place this
// needed mocking.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Same mocking shape as chat-rate-limit.test.ts's own getSupabaseAdmin
// mock — this is the first ownership-check test for a /studio Server
// Action in this codebase, so there's no existing per-file convention to
// reuse; this stays deliberately minimal (mock exactly the calls
// sendClientInvoiceReminderAction makes) rather than building a general
// Server-Action test harness other files would then feel obliged to copy.
const getSupabaseAdminMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}));

const sendInvoiceReminderMock = vi.fn();
vi.mock("@/lib/send-invoice-reminder", () => ({
  sendInvoiceReminder: (invoiceId: string) => sendInvoiceReminderMock(invoiceId),
}));

const getUserWithRetryMock = vi.fn();
vi.mock("@/lib/supabase-server-auth", () => ({
  createServerSupabaseClient: async () => ({}),
  getUserWithRetry: (...args: unknown[]) => getUserWithRetryMock(...args),
}));

const getOrgMembershipMock = vi.fn();
vi.mock("@/lib/org-membership", () => ({
  getOrgMembership: (...args: unknown[]) => getOrgMembershipMock(...args),
}));

// A single, real call shape: .from("invoices").select(...).eq("id", id)
// .eq("clients.org_id", orgId).maybeSingle() — the maybeSingle() result is
// all each test needs to control (found = belongs to the caller's own
// org, null = doesn't, whether because it belongs to another org or
// doesn't exist at all).
function adminReturning(maybeSingleResult: { data: unknown; error: unknown }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve(maybeSingleResult),
          }),
        }),
      }),
    }),
  };
}

beforeEach(() => {
  vi.resetModules();
  getSupabaseAdminMock.mockReset();
  sendInvoiceReminderMock.mockReset();
  getUserWithRetryMock.mockReset();
  getOrgMembershipMock.mockReset();
  getUserWithRetryMock.mockResolvedValue({ data: { user: { email: "owner@org-a.example.com" } } });
  getOrgMembershipMock.mockResolvedValue({ orgId: "org-a" });
});

describe("sendClientInvoiceReminderAction", () => {
  it("rejects an invoice belonging to another org, and never calls sendInvoiceReminder", async () => {
    getSupabaseAdminMock.mockReturnValue(adminReturning({ data: null, error: null }));
    const { sendClientInvoiceReminderAction } = await import("./actions");

    const result = await sendClientInvoiceReminderAction("invoice-owned-by-org-b");

    expect(result).toEqual({ error: "Invoice not found." });
    expect(sendInvoiceReminderMock).not.toHaveBeenCalled();
  });

  it("calls sendInvoiceReminder verbatim once ownership is confirmed", async () => {
    getSupabaseAdminMock.mockReturnValue(adminReturning({ data: { id: "invoice-1" }, error: null }));
    sendInvoiceReminderMock.mockResolvedValue({ sent: true });
    const { sendClientInvoiceReminderAction } = await import("./actions");

    const result = await sendClientInvoiceReminderAction("invoice-1");

    expect(sendInvoiceReminderMock).toHaveBeenCalledWith("invoice-1");
    expect(result).toEqual({ ok: true });
  });

  it("surfaces sendInvoiceReminder's own error (e.g. the tenant-email-unsupported gate) rather than swallowing it", async () => {
    getSupabaseAdminMock.mockReturnValue(adminReturning({ data: { id: "invoice-1" }, error: null }));
    sendInvoiceReminderMock.mockResolvedValue({
      error: "Payment reminder emails aren't available yet for your own clients — this needs per-tenant email sending, which hasn't been built.",
      reason: "tenant_email_unsupported",
    });
    const { sendClientInvoiceReminderAction } = await import("./actions");

    const result = await sendClientInvoiceReminderAction("invoice-1");

    expect(result).toEqual({
      error: "Payment reminder emails aren't available yet for your own clients — this needs per-tenant email sending, which hasn't been built.",
    });
  });
});
