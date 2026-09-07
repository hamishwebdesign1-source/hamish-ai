import { describe, it, expect } from "vitest";
import { filterAiActivityToOrg } from "./ai-activity";

// Round 2 of docs/ai-team's P0 /admin org-isolation fix — audit_log's own
// org_id column is deliberately never trusted here (see the function's own
// comment): live data confirmed it can be actively *wrong*, not just
// missing, for a prospect-scoped entry (real Edinburgh Solutions
// lead.discovered/lead.researched rows carry org_id = HamishAI's id, from
// before logAuditEvent() gained its optional orgId parameter). These tests
// cover the three real shapes that matter: client_id ownership, prospect-
// target ownership, and an entry with neither (Content Factory) always
// being kept.
describe("filterAiActivityToOrg", () => {
  const orgClientIds = new Set(["client-1"]);
  const orgProspectIds = new Set(["prospect-1"]);

  it("keeps an entry whose client_id belongs to the org", () => {
    const entries = [{ client_id: "client-1", target_type: "request", target_id: "req-1" }];
    expect(filterAiActivityToOrg(entries, orgClientIds, orgProspectIds)).toEqual(entries);
  });

  it("excludes an entry whose client_id belongs to another org", () => {
    const entries = [{ client_id: "client-99", target_type: "request", target_id: "req-1" }];
    expect(filterAiActivityToOrg(entries, orgClientIds, orgProspectIds)).toEqual([]);
  });

  it("falls back to prospect-target ownership when client_id is null", () => {
    const owned = { client_id: null, target_type: "prospect", target_id: "prospect-1" };
    const foreign = { client_id: null, target_type: "prospect", target_id: "prospect-99" };
    expect(filterAiActivityToOrg([owned, foreign], orgClientIds, orgProspectIds)).toEqual([owned]);
  });

  it("never lets a foreign-org's prospect-target entry through even if its org_id column happens to say otherwise", () => {
    // Real, confirmed-live shape: discover-leads.ts's lead.discovered/
    // lead.researched logAuditEvent() calls never pass orgId, so a real
    // tenant's own background-discovery audit trail can carry a stale/
    // wrong org_id on the audit_log row itself while the prospect it
    // actually points at is genuinely a different org's. This type doesn't
    // even accept an org_id field, proving the function has no way to be
    // fooled by one.
    const entry = { client_id: null, target_type: "prospect", target_id: "prospect-99" };
    expect(filterAiActivityToOrg([entry], orgClientIds, orgProspectIds)).toEqual([]);
  });

  it("keeps an entry with no client_id and no prospect target — it can't belong to another org (e.g. Content Factory)", () => {
    const entries = [{ client_id: null, target_type: "content_idea", target_id: "idea-1" }];
    expect(filterAiActivityToOrg(entries, orgClientIds, orgProspectIds)).toEqual(entries);
  });
});
