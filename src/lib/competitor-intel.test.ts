import { describe, it, expect } from "vitest";
import { pickClientsToResearch } from "./competitor-intel";

type ClientRow = { id: string; business_name: string; source_lead_id: string | null };
type IntelRow = { client_id: string; created_at: string };

// A chainable, directly-awaitable stub matching the two real query shapes
// pickClientsToResearch() uses: clients.select().eq().neq() and
// client_competitor_intel.select().in().order() — same "every filter
// method returns the same object, which is itself thenable" shape as
// autonomous-outreach.test.ts's own chain stub.
function chain<T>(data: T) {
  const self = {
    eq: () => self,
    neq: () => self,
    in: () => self,
    order: () => self,
    then: (resolve: (v: { data: T; error: null }) => unknown) => resolve({ data, error: null }),
  };
  return self;
}

function buildAdmin(clients: ClientRow[], intelRows: IntelRow[]) {
  return {
    from(table: string) {
      if (table === "clients") return { select: () => chain(clients) };
      if (table === "client_competitor_intel") return { select: () => chain(intelRows) };
      throw new Error(`Unexpected table in test: ${table}`);
    },
  };
}

describe("pickClientsToResearch", () => {
  it("prioritises never-checked clients over ones checked before", async () => {
    const admin = buildAdmin(
      [
        { id: "c-checked", business_name: "Checked Co", source_lead_id: null },
        { id: "c-never", business_name: "Never Co", source_lead_id: null },
      ],
      [{ client_id: "c-checked", created_at: "2026-01-01T00:00:00Z" }]
    );

    const picked = await pickClientsToResearch(admin as never, "org-1");

    expect(picked.map((c) => c.id)).toEqual(["c-never", "c-checked"]);
  });

  it("orders already-checked clients oldest-checked first", async () => {
    const admin = buildAdmin(
      [
        { id: "c-recent", business_name: "Recent Co", source_lead_id: null },
        { id: "c-old", business_name: "Old Co", source_lead_id: null },
      ],
      [
        { client_id: "c-recent", created_at: "2026-08-01T00:00:00Z" },
        { client_id: "c-old", created_at: "2026-01-01T00:00:00Z" },
      ]
    );

    const picked = await pickClientsToResearch(admin as never, "org-1");

    expect(picked.map((c) => c.id)).toEqual(["c-old", "c-recent"]);
  });

  it("uses each client's most recent check when it has more than one row", async () => {
    const admin = buildAdmin(
      [
        { id: "c1", business_name: "One", source_lead_id: null },
        { id: "c2", business_name: "Two", source_lead_id: null },
      ],
      [
        // c1's most recent check (May) is newer than c2's only check
        // (March) — c1 should sort after c2, not before, even though c1
        // also has an older January row in the mix.
        { client_id: "c1", created_at: "2026-05-01T00:00:00Z" },
        { client_id: "c1", created_at: "2026-01-01T00:00:00Z" },
        { client_id: "c2", created_at: "2026-03-01T00:00:00Z" },
      ]
    );

    const picked = await pickClientsToResearch(admin as never, "org-1");

    expect(picked.map((c) => c.id)).toEqual(["c2", "c1"]);
  });

  it("caps the result at 3 clients even when more are eligible", async () => {
    const clients: ClientRow[] = Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, business_name: `Client ${i}`, source_lead_id: null }));
    const admin = buildAdmin(clients, []);

    const picked = await pickClientsToResearch(admin as never, "org-1");

    expect(picked).toHaveLength(3);
  });

  it("returns an empty array for an org with no clients", async () => {
    const admin = buildAdmin([], []);
    expect(await pickClientsToResearch(admin as never, "org-1")).toEqual([]);
  });
});
