import { describe, it, expect } from "vitest";
import { seatLimitForPlan, listTeamMembers, inviteTeamMember, removeTeamMember } from "./team-members";

// A chainable, directly-awaitable stub — filter methods return the same
// builder, and the builder is itself thenable, matching every shape this
// file's queries actually use (select().eq().order(), select().eq().eq().maybeSingle(),
// select().eq().limit().maybeSingle(), insert(), delete().eq().eq()).
function chain<T>(data: T) {
  const self = {
    eq: () => self,
    order: () => self,
    limit: () => self,
    maybeSingle: () => Promise.resolve({ data, error: null }),
    then: (resolve: (v: { data: T; error: null }) => unknown) => resolve({ data, error: null }),
  };
  return self;
}

function buildAdmin(opts: {
  existingMembership?: { org_id: string } | null;
  members?: { email: string; role: string; invited_at: string; accepted_at: string | null }[];
  insertError?: string;
  deleteError?: string;
  removeTargetRole?: "owner" | "member" | null;
  onInsert?: (row: Record<string, unknown>) => void;
  onDelete?: () => void;
}) {
  let selectCall = 0;
  return {
    from(table: string) {
      if (table !== "memberships") throw new Error(`Unexpected table in test: ${table}`);
      return {
        select: (cols: string) => {
          selectCall++;
          // inviteTeamMember's own "already exists?" lookup uses
          // .select("org_id")...maybeSingle(); listTeamMembers uses
          // .select("email, role, invited_at, accepted_at")...order();
          // removeTeamMember uses .select("role")...maybeSingle(). The
          // column list is enough to tell them apart deterministically
          // without needing separate mock instances per call site.
          if (cols === "org_id") return chain(opts.existingMembership ?? null);
          if (cols === "role") return chain(opts.removeTargetRole ? { role: opts.removeTargetRole } : null);
          return chain(opts.members ?? []);
        },
        insert: (row: Record<string, unknown>) => {
          opts.onInsert?.(row);
          return Promise.resolve({ error: opts.insertError ? { message: opts.insertError } : null });
        },
        delete: () => ({
          eq: () => ({
            eq: () => {
              opts.onDelete?.();
              return Promise.resolve({ error: opts.deleteError ? { message: opts.deleteError } : null });
            },
          }),
        }),
      };
    },
    _selectCalls: () => selectCall,
  };
}

describe("seatLimitForPlan", () => {
  it("returns 1 for starter and professional", () => {
    expect(seatLimitForPlan("starter")).toBe(1);
    expect(seatLimitForPlan("professional")).toBe(1);
  });

  it("returns the unadvertised seat cap for agency, not a literal 'multiple'", () => {
    const limit = seatLimitForPlan("agency");
    expect(typeof limit).toBe("number");
    expect(limit).toBeGreaterThan(1);
  });
});

describe("listTeamMembers", () => {
  it("maps rows to the TeamMember shape", async () => {
    const admin = buildAdmin({
      members: [{ email: "owner@acme.example", role: "owner", invited_at: "2026-01-01T00:00:00Z", accepted_at: "2026-01-01T00:00:00Z" }],
    });
    const result = await listTeamMembers(admin as never, "org-1");
    expect(result).toEqual([{ email: "owner@acme.example", role: "owner", invitedAt: "2026-01-01T00:00:00Z", acceptedAt: "2026-01-01T00:00:00Z" }]);
  });
});

describe("inviteTeamMember", () => {
  const base = { orgId: "org-1", plan: "agency" as const, inviterEmail: "owner@acme.example" };

  it("rejects an invalid email", async () => {
    const admin = buildAdmin({});
    const result = await inviteTeamMember(admin as never, { ...base, inviteeEmail: "not-an-email" });
    expect(result).toEqual({ error: "Enter a valid email address." });
  });

  it("refuses an email that's already a member of this org", async () => {
    const admin = buildAdmin({ existingMembership: { org_id: "org-1" } });
    const result = await inviteTeamMember(admin as never, { ...base, inviteeEmail: "existing@acme.example" });
    expect(result).toEqual({ error: "This person is already on your team." });
  });

  it("refuses an email that already belongs to a different workspace", async () => {
    const admin = buildAdmin({ existingMembership: { org_id: "org-other" } });
    const result = await inviteTeamMember(admin as never, { ...base, inviteeEmail: "taken@elsewhere.example" });
    expect(result).toEqual({ error: "This email already belongs to a different workspace." });
  });

  it("refuses to invite on a 1-seat plan with the owner already filling it", async () => {
    const admin = buildAdmin({
      existingMembership: null,
      members: [{ email: "owner@acme.example", role: "owner", invited_at: "2026-01-01T00:00:00Z", accepted_at: "2026-01-01T00:00:00Z" }],
    });
    const result = await inviteTeamMember(admin as never, { ...base, plan: "starter", inviteeEmail: "new@acme.example" });
    expect(result).toEqual({ error: "Your plan includes 1 seat. Upgrade to the Agency plan to add team members." });
  });

  it("refuses to invite once an agency org has filled its seat cap", async () => {
    const limit = seatLimitForPlan("agency");
    const members = Array.from({ length: limit }, (_, i) => ({
      email: `member${i}@acme.example`,
      role: "member",
      invited_at: "2026-01-01T00:00:00Z",
      accepted_at: null,
    }));
    const admin = buildAdmin({ existingMembership: null, members });
    const result = await inviteTeamMember(admin as never, { ...base, inviteeEmail: "one-more@acme.example" });
    expect(result).toEqual({ error: `You've reached this workspace's team limit (${limit} seats).` });
  });

  it("inserts a pending member row, lower-cased, for a valid invite with room on the plan", async () => {
    const inserted: Record<string, unknown>[] = [];
    const admin = buildAdmin({
      existingMembership: null,
      members: [{ email: "owner@acme.example", role: "owner", invited_at: "2026-01-01T00:00:00Z", accepted_at: "2026-01-01T00:00:00Z" }],
      onInsert: (row) => inserted.push(row),
    });

    const result = await inviteTeamMember(admin as never, { ...base, inviteeEmail: "New.Teammate@Acme.example" });

    expect(result).toEqual({ ok: true });
    expect(inserted).toEqual([{ org_id: "org-1", email: "new.teammate@acme.example", role: "member", invited_by: "owner@acme.example" }]);
  });

  it("surfaces an insert failure instead of claiming success", async () => {
    const admin = buildAdmin({ existingMembership: null, members: [], insertError: "db down" });
    const result = await inviteTeamMember(admin as never, { ...base, inviteeEmail: "new@acme.example" });
    expect(result).toEqual({ error: "Failed to invite that person." });
  });
});

describe("removeTeamMember", () => {
  it("refuses to remove someone who isn't on the team", async () => {
    const admin = buildAdmin({ removeTargetRole: null });
    const result = await removeTeamMember(admin as never, "org-1", "nobody@acme.example");
    expect(result).toEqual({ error: "That person isn't on your team." });
  });

  it("refuses to remove the owner", async () => {
    const admin = buildAdmin({ removeTargetRole: "owner" });
    const result = await removeTeamMember(admin as never, "org-1", "owner@acme.example");
    expect(result).toEqual({ error: "The workspace owner can't be removed." });
  });

  it("removes a real member", async () => {
    let deleted = false;
    const admin = buildAdmin({ removeTargetRole: "member", onDelete: () => (deleted = true) });
    const result = await removeTeamMember(admin as never, "org-1", "member@acme.example");
    expect(result).toEqual({ ok: true });
    expect(deleted).toBe(true);
  });
});
