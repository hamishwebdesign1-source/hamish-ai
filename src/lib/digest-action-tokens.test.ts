import { describe, it, expect, vi, beforeEach } from "vitest";

const getSupabaseAdminMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}));

type TokenRow = {
  org_id: string;
  action: "mark_prospect_contacted" | "mark_request_responded" | "mark_project_done";
  target_id: string;
  label: string;
  used_at: string | null;
  expires_at: string;
};

// A chainable, directly-awaitable stub — every filter method returns the
// same builder, and the builder itself is thenable, matching both the
// one-`.eq()` (requests) and two-`.eq()` (prospects/projects) update
// shapes performDigestAction() actually calls, with no `.single()` or
// `.maybeSingle()` needed for updates in this file.
function updateBuilder(onSettle: () => { error: { message: string } | null }) {
  const self = {
    eq: () => self,
    is: () => self,
    then: (resolve: (v: { error: { message: string } | null }) => unknown) => resolve(onSettle()),
  };
  return self;
}

function buildAdmin(opts: {
  tokenRow?: TokenRow | null;
  insertError?: string;
  onInsert?: (row: Record<string, unknown>) => void;
  writeError?: string; // simulates the target table's own update failing
  onWrite?: (table: string, patch: Record<string, unknown>) => void;
}) {
  return {
    from(table: string) {
      if (table === "digest_action_tokens") {
        return {
          insert: (row: Record<string, unknown>) => {
            opts.onInsert?.(row);
            return Promise.resolve({ error: opts.insertError ? { message: opts.insertError } : null });
          },
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: opts.tokenRow ?? null, error: null }),
            }),
          }),
          update: () => updateBuilder(() => ({ error: null })),
        };
      }
      // prospects / requests / projects — whichever table performDigestAction() writes to
      return {
        update: (patch: Record<string, unknown>) =>
          updateBuilder(() => {
            opts.onWrite?.(table, patch);
            return { error: opts.writeError ? { message: opts.writeError } : null };
          }),
      };
    },
  };
}

beforeEach(() => {
  vi.resetModules();
  getSupabaseAdminMock.mockReset();
});

describe("createDigestActionToken", () => {
  it("inserts a row with the given fields and returns a real random token", async () => {
    const inserted: Record<string, unknown>[] = [];
    getSupabaseAdminMock.mockReturnValue(buildAdmin({ onInsert: (row) => inserted.push(row) }));
    const { createDigestActionToken } = await import("./digest-action-tokens");

    const token = await createDigestActionToken(getSupabaseAdminMock() as never, {
      orgId: "org-1",
      action: "mark_prospect_contacted",
      targetId: "prospect-1",
      label: "Acme Cafe — follow-up handled",
    });

    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ token, org_id: "org-1", action: "mark_prospect_contacted", target_id: "prospect-1", label: "Acme Cafe — follow-up handled" });
  });

  it("returns null rather than throwing when the insert fails", async () => {
    getSupabaseAdminMock.mockReturnValue(buildAdmin({ insertError: "db down" }));
    const { createDigestActionToken } = await import("./digest-action-tokens");

    const token = await createDigestActionToken(getSupabaseAdminMock() as never, {
      orgId: "org-1",
      action: "mark_project_done",
      targetId: "project-1",
      label: "x",
    });

    expect(token).toBeNull();
  });
});

describe("readDigestActionToken", () => {
  it("returns null for an unknown token", async () => {
    getSupabaseAdminMock.mockReturnValue(buildAdmin({ tokenRow: null }));
    const { readDigestActionToken } = await import("./digest-action-tokens");

    expect(await readDigestActionToken("nope")).toBeNull();
  });

  it("reports used:true for an already-consumed token", async () => {
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin({
        tokenRow: {
          org_id: "org-1",
          action: "mark_project_done",
          target_id: "project-1",
          label: "Done thing",
          used_at: "2026-01-01T00:00:00Z",
          expires_at: "2099-01-01T00:00:00Z",
        },
      })
    );
    const { readDigestActionToken } = await import("./digest-action-tokens");

    expect(await readDigestActionToken("tok")).toEqual({ label: "Done thing", action: "mark_project_done", used: true, expired: false });
  });

  it("reports expired:true for a token past its expiry", async () => {
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin({
        tokenRow: {
          org_id: "org-1",
          action: "mark_request_responded",
          target_id: "req-1",
          label: "x",
          used_at: null,
          expires_at: "2000-01-01T00:00:00Z",
        },
      })
    );
    const { readDigestActionToken } = await import("./digest-action-tokens");

    const view = await readDigestActionToken("tok");
    expect(view?.used).toBe(false);
    expect(view?.expired).toBe(true);
  });
});

describe("consumeDigestActionToken", () => {
  it("refuses an unknown token", async () => {
    getSupabaseAdminMock.mockReturnValue(buildAdmin({ tokenRow: null }));
    const { consumeDigestActionToken } = await import("./digest-action-tokens");

    expect(await consumeDigestActionToken("nope")).toEqual({ error: "This link isn't valid." });
  });

  it("refuses an already-used token without repeating the write", async () => {
    const writes: { table: string; patch: Record<string, unknown> }[] = [];
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin({
        tokenRow: {
          org_id: "org-1",
          action: "mark_prospect_contacted",
          target_id: "prospect-1",
          label: "x",
          used_at: "2026-01-01T00:00:00Z",
          expires_at: "2099-01-01T00:00:00Z",
        },
        onWrite: (table, patch) => writes.push({ table, patch }),
      })
    );
    const { consumeDigestActionToken } = await import("./digest-action-tokens");

    const result = await consumeDigestActionToken("tok");

    expect(result).toEqual({ error: "This link has already been used." });
    expect(writes).toHaveLength(0);
  });

  it("refuses an expired token", async () => {
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin({
        tokenRow: {
          org_id: "org-1",
          action: "mark_prospect_contacted",
          target_id: "prospect-1",
          label: "x",
          used_at: null,
          expires_at: "2000-01-01T00:00:00Z",
        },
      })
    );
    const { consumeDigestActionToken } = await import("./digest-action-tokens");

    expect(await consumeDigestActionToken("tok")).toEqual({ error: "This link has expired." });
  });

  it("marks a prospect contacted, org-scoped, for a valid mark_prospect_contacted token", async () => {
    const writes: { table: string; patch: Record<string, unknown> }[] = [];
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin({
        tokenRow: {
          org_id: "org-1",
          action: "mark_prospect_contacted",
          target_id: "prospect-1",
          label: "Acme Cafe — follow-up handled",
          used_at: null,
          expires_at: "2099-01-01T00:00:00Z",
        },
        onWrite: (table, patch) => writes.push({ table, patch }),
      })
    );
    const { consumeDigestActionToken } = await import("./digest-action-tokens");

    const result = await consumeDigestActionToken("tok");

    expect(result).toEqual({ ok: true, label: "Acme Cafe — follow-up handled" });
    expect(writes).toHaveLength(1);
    expect(writes[0].table).toBe("prospects");
    expect(writes[0].patch).toMatchObject({ status: "contacted", last_contact_method: "email" });
  });

  it("marks a request responded for a valid mark_request_responded token", async () => {
    const writes: { table: string; patch: Record<string, unknown> }[] = [];
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin({
        tokenRow: {
          org_id: "org-1",
          action: "mark_request_responded",
          target_id: "req-1",
          label: "x",
          used_at: null,
          expires_at: "2099-01-01T00:00:00Z",
        },
        onWrite: (table, patch) => writes.push({ table, patch }),
      })
    );
    const { consumeDigestActionToken } = await import("./digest-action-tokens");

    const result = await consumeDigestActionToken("tok");

    expect(result).toEqual({ ok: true, label: "x" });
    expect(writes[0].table).toBe("requests");
    expect(writes[0].patch).toHaveProperty("responded_at");
  });

  it("marks a project done for a valid mark_project_done token", async () => {
    const writes: { table: string; patch: Record<string, unknown> }[] = [];
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin({
        tokenRow: {
          org_id: "org-1",
          action: "mark_project_done",
          target_id: "project-1",
          label: "x",
          used_at: null,
          expires_at: "2099-01-01T00:00:00Z",
        },
        onWrite: (table, patch) => writes.push({ table, patch }),
      })
    );
    const { consumeDigestActionToken } = await import("./digest-action-tokens");

    const result = await consumeDigestActionToken("tok");

    expect(result).toEqual({ ok: true, label: "x" });
    expect(writes[0].table).toBe("projects");
    // Projects Kanban Command Centre, Phase A — stage is kept in sync
    // alongside status, so the project doesn't stay stuck in its old
    // Kanban column while reading as "done" everywhere else.
    expect(writes[0].patch).toEqual({ status: "done", stage: "completed" });
  });

  it("surfaces the underlying write failure instead of claiming success", async () => {
    getSupabaseAdminMock.mockReturnValue(
      buildAdmin({
        tokenRow: {
          org_id: "org-1",
          action: "mark_project_done",
          target_id: "project-1",
          label: "x",
          used_at: null,
          expires_at: "2099-01-01T00:00:00Z",
        },
        writeError: "db down",
      })
    );
    const { consumeDigestActionToken } = await import("./digest-action-tokens");

    const result = await consumeDigestActionToken("tok");

    expect(result).toEqual({ error: "Failed to update the project." });
  });
});
