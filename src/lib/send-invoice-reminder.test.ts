import { describe, it, expect, vi, beforeEach } from "vitest";

// Same mocking shape as chat-rate-limit.test.ts's own getSupabaseAdmin
// mock — a hand-rolled stub of exactly the chain shapes
// sendInvoiceReminder() uses, not the shared relational
// test-helpers/mock-supabase.ts (which doesn't support .update() or
// cross-table joins, and a single fixed call sequence per table here is
// simpler than teaching it to).
const getSupabaseAdminMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}));

const sendClientEmailMock = vi.fn();
vi.mock("@/lib/send-client-email", () => ({
  sendClientEmail: (...args: unknown[]) => sendClientEmailMock(...args),
}));

type Row = Record<string, unknown> | null;

function buildAdmin(opts: { invoice: Row; client: Row; org: Row; onUpdate?: (patch: unknown) => void }) {
  const { invoice, client, org, onUpdate } = opts;
  return {
    from(table: string) {
      if (table === "invoices") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve(invoice ? { data: invoice, error: null } : { data: null, error: { message: "not found" } }),
            }),
          }),
          update: (patch: unknown) => ({
            eq: () => {
              onUpdate?.(patch);
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      if (table === "clients") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: client, error: null }),
            }),
          }),
        };
      }
      if (table === "organisations") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: org, error: null }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    },
  };
}

const OPEN_INVOICE = {
  id: "inv-1",
  client_id: "client-1",
  amount_pence: 25000,
  description: "Website maintenance",
  stripe_hosted_invoice_url: "https://pay.example/inv-1",
  due_date: "2026-08-01",
  status: "open",
};

beforeEach(() => {
  vi.resetModules();
  getSupabaseAdminMock.mockReset();
  sendClientEmailMock.mockReset();
});

describe("sendInvoiceReminder", () => {
  it("sends the reminder for a legacy client with no org_id (treated as internal, matching resolveSender's own rule)", async () => {
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin({
        invoice: OPEN_INVOICE,
        client: { email: "client@example.com", business_name: "Acme", org_id: null },
        org: null,
      })
    );
    const { sendInvoiceReminder } = await import("./send-invoice-reminder");

    const result = await sendInvoiceReminder("inv-1");

    expect(result).toEqual({ sent: true });
    expect(sendClientEmailMock).toHaveBeenCalledTimes(1);
    expect(sendClientEmailMock.mock.calls[0][0]).toBe("client@example.com");
  });

  it("sends the reminder for a client belonging to a confirmed internal org", async () => {
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin({
        invoice: OPEN_INVOICE,
        client: { email: "client@example.com", business_name: "Acme", org_id: "org-hamishai" },
        org: { is_internal: true },
      })
    );
    const { sendInvoiceReminder } = await import("./send-invoice-reminder");

    const result = await sendInvoiceReminder("inv-1");

    expect(result).toEqual({ sent: true });
    expect(sendClientEmailMock).toHaveBeenCalledTimes(1);
  });

  it("refuses to send, and never calls sendClientEmail, for a confirmed non-internal (tenant) org", async () => {
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin({
        invoice: OPEN_INVOICE,
        client: { email: "client@example.com", business_name: "Their Client", org_id: "org-tenant" },
        org: { is_internal: false },
      })
    );
    const { sendInvoiceReminder } = await import("./send-invoice-reminder");

    const result = await sendInvoiceReminder("inv-1");

    expect(result).toEqual({
      error: "Payment reminder emails aren't available yet for your own clients — this needs per-tenant email sending, which hasn't been built.",
      reason: "tenant_email_unsupported",
    });
    expect(sendClientEmailMock).not.toHaveBeenCalled();
  });

  it("fails closed (refuses to send) on an errored/missing organisation lookup, same as resolveSender()'s own rule", async () => {
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin({
        invoice: OPEN_INVOICE,
        client: { email: "client@example.com", business_name: "Their Client", org_id: "org-tenant" },
        org: null,
      })
    );
    const { sendInvoiceReminder } = await import("./send-invoice-reminder");

    const result = await sendInvoiceReminder("inv-1");

    expect("error" in result && result.reason).toBe("tenant_email_unsupported");
    expect(sendClientEmailMock).not.toHaveBeenCalled();
  });

  it("still refuses a non-open invoice before ever resolving sender identity", async () => {
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin({
        invoice: { ...OPEN_INVOICE, status: "paid" },
        client: null,
        org: null,
      })
    );
    const { sendInvoiceReminder } = await import("./send-invoice-reminder");

    const result = await sendInvoiceReminder("inv-1");

    expect(result).toEqual({ error: "This invoice isn't awaiting payment." });
    expect(sendClientEmailMock).not.toHaveBeenCalled();
  });
});
