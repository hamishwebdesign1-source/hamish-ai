import { describe, it, expect, vi, beforeEach } from "vitest";

const getSupabaseAdminMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}));

const sendClientEmailMock = vi.fn();
vi.mock("@/lib/send-client-email", () => ({
  sendClientEmail: (...args: unknown[]) => sendClientEmailMock(...args),
}));

const sendOrgEmailMock = vi.fn();
vi.mock("@/lib/send-org-email", () => ({
  sendOrgEmail: (...args: unknown[]) => sendOrgEmailMock(...args),
}));

const renderMonthlyReportPdfMock = vi.fn();
vi.mock("@/lib/monthly-report-pdf", () => ({
  renderMonthlyReportPdf: (...args: unknown[]) => renderMonthlyReportPdfMock(...args),
}));

// A chainable, directly-awaitable stub — filter methods return the same
// object, and it resolves via .single()/.maybeSingle() or by being
// awaited directly (the plain-array queries inside computeSnapshot()).
// Same "one stub shape covers every real call site" approach as this
// suite's other Supabase mocks.
function chain<T>(data: T) {
  const self = {
    eq: () => self,
    gte: () => self,
    lte: () => self,
    in: () => self,
    select: () => self,
    single: () => Promise.resolve({ data, error: null }),
    maybeSingle: () => Promise.resolve({ data, error: null }),
    then: (resolve: (v: { data: T; error: null }) => unknown) => resolve({ data, error: null }),
  };
  return self;
}

type OrgRow = { name: string; is_internal: boolean; brand: Record<string, unknown> };

function buildAdmin(org: OrgRow) {
  return {
    from(table: string) {
      if (table === "clients") {
        return { select: () => chain({ id: "client-1", org_id: "org-1", business_name: "Acme Cafe", email: "owner@acme.example" }) };
      }
      if (table === "organisations") {
        return { select: () => chain(org) };
      }
      if (table === "monthly_reports") {
        return {
          select: () => chain(null), // no existing report this month
          insert: () => ({ select: () => chain({ id: "report-1" }) }),
        };
      }
      // requests / tasks / invoices / site_checks — computeSnapshot()'s
      // own queries, empty is a perfectly real "nothing happened this
      // month" answer and not what this test file is verifying.
      return { select: () => chain([]) };
    },
  };
}

beforeEach(() => {
  vi.resetModules();
  getSupabaseAdminMock.mockReset();
  sendClientEmailMock.mockReset();
  sendOrgEmailMock.mockReset();
  renderMonthlyReportPdfMock.mockReset();
  renderMonthlyReportPdfMock.mockResolvedValue(Buffer.from("fake-pdf"));
});

describe("generateMonthlyReport — email branching", () => {
  it("sends via sendClientEmail, with the PDF attached, for HamishAI's own internal org", async () => {
    getSupabaseAdminMock.mockReturnValue(buildAdmin({ name: "Hamish AI", is_internal: true, brand: {} }));
    const { generateMonthlyReport } = await import("./monthly-report");

    await generateMonthlyReport("client-1", new Date("2026-09-01"));

    expect(sendClientEmailMock).toHaveBeenCalledTimes(1);
    expect(sendOrgEmailMock).not.toHaveBeenCalled();
    const [to, , , attachments] = sendClientEmailMock.mock.calls[0];
    expect(to).toBe("owner@acme.example");
    expect(attachments).toEqual([{ filename: expect.stringContaining("report.pdf"), content: Buffer.from("fake-pdf") }]);
  });

  it("sends via sendOrgEmail, with the PDF attached, for a tenant org that's configured a reply-to email", async () => {
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin({ name: "Their Agency", is_internal: false, brand: { replyToEmail: "owner@theiragency.example" } })
    );
    const { generateMonthlyReport } = await import("./monthly-report");

    await generateMonthlyReport("client-1", new Date("2026-09-01"));

    expect(sendOrgEmailMock).toHaveBeenCalledTimes(1);
    expect(sendClientEmailMock).not.toHaveBeenCalled();
    expect(sendOrgEmailMock.mock.calls[0][0]).toMatchObject({
      orgId: "org-1",
      orgName: "Their Agency",
      replyToEmail: "owner@theiragency.example",
      to: "owner@acme.example",
      attachments: [{ filename: expect.stringContaining("report.pdf"), content: Buffer.from("fake-pdf") }],
    });
  });

  it("sends no email at all for a tenant org that hasn't configured a reply-to email — the client still gets the report in-portal", async () => {
    getSupabaseAdminMock.mockReturnValue(buildAdmin({ name: "Their Agency", is_internal: false, brand: {} }));
    const { generateMonthlyReport } = await import("./monthly-report");

    const result = await generateMonthlyReport("client-1", new Date("2026-09-01"));

    expect(sendClientEmailMock).not.toHaveBeenCalled();
    expect(sendOrgEmailMock).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, reportId: "report-1" });
  });
});
