import { describe, it, expect } from "vitest";
import { filterAiActivityToOrg, filterClientlessActivityLogEntriesToOrg } from "./ai-activity";

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

// Round 4 of docs/ai-team's P0 /admin org-isolation fix — /admin/activity-log's
// own sibling to filterAiActivityToOrg(), for its client_id-less rows only.
// Security Auditor's live sample found 58 of 90 resolvable client_id-less
// rows genuinely belonged to Edinburgh Solutions (lead.*/project.*/
// deliverable.*/task.* actions) once resolved via target_id the same way
// filterAiActivityToOrg() already does for /admin/ai-activity. The one
// deliberate difference from that function: its "keep" default is only
// safe for AI_ACTIVITY_ACTIONS' small closed list, so this function
// defaults to EXCLUDED for anything it can't resolve, with content.* as the
// sole named exception (content_ideas has no org_id/tenant concept at all).
describe("filterClientlessActivityLogEntriesToOrg", () => {
  const orgProspectIds = new Set(["prospect-1"]);
  const orgProjectIds = new Set(["project-1"]);

  it("keeps a lead.* action whose prospect target belongs to the org", () => {
    const entries = [{ action: "lead.discovered", target_type: "prospect", target_id: "prospect-1" }];
    expect(filterClientlessActivityLogEntriesToOrg(entries, orgProspectIds, orgProjectIds)).toEqual(entries);
  });

  it("excludes a lead.* action whose prospect target belongs to another org", () => {
    const entries = [{ action: "lead.researched", target_type: "prospect", target_id: "prospect-99" }];
    expect(filterClientlessActivityLogEntriesToOrg(entries, orgProspectIds, orgProjectIds)).toEqual([]);
  });

  it("keeps a project.*/deliverable.*/task.* action whose project target belongs to the org", () => {
    const entries = [
      { action: "project.stage_changed", target_type: "project", target_id: "project-1" },
      { action: "deliverable.submitted", target_type: "project", target_id: "project-1" },
      { action: "task.deleted", target_type: "project", target_id: "project-1" },
    ];
    expect(filterClientlessActivityLogEntriesToOrg(entries, orgProspectIds, orgProjectIds)).toEqual(entries);
  });

  it("excludes a project.*/deliverable.*/task.* action whose project target belongs to another org", () => {
    const entries = [
      { action: "project.created", target_type: "project", target_id: "project-99" },
      { action: "deliverable.deleted", target_type: "project", target_id: "project-99" },
      { action: "task.deleted", target_type: "project", target_id: "project-99" },
    ];
    expect(filterClientlessActivityLogEntriesToOrg(entries, orgProspectIds, orgProjectIds)).toEqual([]);
  });

  it("keeps a content.* action regardless of target — content_ideas has no tenant concept", () => {
    const entries = [{ action: "content.idea_discovered", target_type: "content_idea", target_id: "idea-1" }];
    expect(filterClientlessActivityLogEntriesToOrg(entries, orgProspectIds, orgProjectIds)).toEqual(entries);
  });

  it("excludes an unresolvable, non-content action conservatively rather than guessing", () => {
    // Anything that isn't organisation.* (handled elsewhere), doesn't
    // resolve via a known target type, and isn't content.* — a future new
    // action type this app hasn't been taught to resolve yet, e.g.
    const entries = [{ action: "some.future_action", target_type: null, target_id: null }];
    expect(filterClientlessActivityLogEntriesToOrg(entries, orgProspectIds, orgProjectIds)).toEqual([]);
  });
});
