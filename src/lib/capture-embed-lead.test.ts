import { describe, it, expect, vi, beforeEach } from "vitest";

const getSupabaseAdminMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}));

const sendClientEmailMock = vi.fn();
vi.mock("@/lib/send-client-email", () => ({
  sendClientEmail: (...args: unknown[]) => sendClientEmailMock(...args),
}));

type ClientRow = { id: string; business_name: string; org_id: string; chatbot_embed_enabled: boolean };

// A chainable, directly-awaitable stub — matches every real query shape
// capture-embed-lead.ts's queries use: clients.select().eq().maybeSingle(),
// embed_leads.insert(), memberships.select().eq().eq().not(). Same
// "one stub shape covers every call site" approach as this suite's
// other Supabase mocks (competitor-intel.test.ts's own chain()).
function chain<T>(data: T) {
  const self = {
    eq: () => self,
    not: () => Promise.resolve({ data, error: null }),
    maybeSingle: () => Promise.resolve({ data, error: null }),
  };
  return self;
}

function buildAdmin(client: ClientRow | null, insertError: { message: string } | null = null, owners: { email: string }[] = []) {
  const insertMock = vi.fn().mockResolvedValue({ error: insertError });
  return {
    insertMock,
    admin: {
      from(table: string) {
        if (table === "clients") return { select: () => chain(client) };
        if (table === "embed_leads") return { insert: insertMock };
        if (table === "memberships") return { select: () => chain(owners) };
        throw new Error(`Unexpected table in test: ${table}`);
      },
    },
  };
}

const baseClient: ClientRow = { id: "client-1", business_name: "Acme Cafe", org_id: "org-1", chatbot_embed_enabled: true };

beforeEach(() => {
  vi.resetModules();
  getSupabaseAdminMock.mockReset();
  sendClientEmailMock.mockReset();
});

describe("captureEmbedLead", () => {
  it("saves a valid lead and returns ok", async () => {
    const { admin, insertMock } = buildAdmin(baseClient, null, [{ email: "owner@agency.example" }]);
    getSupabaseAdminMock.mockReturnValue(admin);

    const { captureEmbedLead } = await import("./capture-embed-lead");
    const result = await captureEmbedLead("client-1", "Visitor@Example.com", "  Can you do weekend bookings?  ");

    expect(result).toEqual({ ok: true });
    expect(insertMock).toHaveBeenCalledWith({
      client_id: "client-1",
      org_id: "org-1",
      email: "visitor@example.com",
      message: "Can you do weekend bookings?",
    });
  });

  it("notifies the org's accepted owners after a successful save", async () => {
    const { admin } = buildAdmin(baseClient, null, [{ email: "owner@agency.example" }]);
    getSupabaseAdminMock.mockReturnValue(admin);

    const { captureEmbedLead } = await import("./capture-embed-lead");
    await captureEmbedLead("client-1", "visitor@example.com", null);
    // notifyNewEmbedLead is fire-and-forget but awaited internally by the
    // mocked send — flush microtasks once more before asserting.
    await Promise.resolve();
    await Promise.resolve();

    expect(sendClientEmailMock).toHaveBeenCalledWith(
      "owner@agency.example",
      expect.stringContaining("Acme Cafe"),
      expect.stringContaining("visitor@example.com")
    );
  });

  it("rejects an invalid email address before ever touching the database", async () => {
    const { admin, insertMock } = buildAdmin(baseClient);
    getSupabaseAdminMock.mockReturnValue(admin);

    const { captureEmbedLead } = await import("./capture-embed-lead");
    const result = await captureEmbedLead("client-1", "not-an-email", null);

    expect(result).toEqual({ error: "Enter a valid email address." });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("refuses when the client's chatbot embed isn't enabled", async () => {
    const { admin, insertMock } = buildAdmin({ ...baseClient, chatbot_embed_enabled: false });
    getSupabaseAdminMock.mockReturnValue(admin);

    const { captureEmbedLead } = await import("./capture-embed-lead");
    const result = await captureEmbedLead("client-1", "visitor@example.com", null);

    expect(result).toEqual({ error: "Chat is not available." });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("refuses when the client doesn't exist", async () => {
    const { admin } = buildAdmin(null);
    getSupabaseAdminMock.mockReturnValue(admin);

    const { captureEmbedLead } = await import("./capture-embed-lead");
    const result = await captureEmbedLead("client-1", "visitor@example.com", null);

    expect(result).toEqual({ error: "Chat is not available." });
  });

  it("surfaces a save failure without throwing", async () => {
    const { admin } = buildAdmin(baseClient, { message: "db down" });
    getSupabaseAdminMock.mockReturnValue(admin);

    const { captureEmbedLead } = await import("./capture-embed-lead");
    const result = await captureEmbedLead("client-1", "visitor@example.com", null);

    expect(result).toEqual({ error: "Failed to save your details — please try again." });
  });
});
