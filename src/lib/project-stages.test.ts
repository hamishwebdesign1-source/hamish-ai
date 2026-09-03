import { describe, it, expect } from "vitest";
import { PROJECT_STAGES, isProjectStage, getProjectStageMeta, deriveProjectStatus, PORTAL_PROJECT_STAGE_META } from "./project-stages";

describe("PROJECT_STAGES", () => {
  it("has exactly the 5 approved stages, in pipeline order", () => {
    expect(PROJECT_STAGES.map((s) => s.id)).toEqual(["not_started", "in_progress", "internal_review", "client_review", "completed"]);
  });

  it("only client_review and completed carry a column accent", () => {
    const withAccent = PROJECT_STAGES.filter((s) => s.columnAccentClassName !== null).map((s) => s.id);
    expect(withAccent).toEqual(["client_review", "completed"]);
  });

  it("only client_review shows the column dot", () => {
    const withDot = PROJECT_STAGES.filter((s) => s.columnDot).map((s) => s.id);
    expect(withDot).toEqual(["client_review"]);
  });
});

describe("isProjectStage", () => {
  it("accepts every real stage id", () => {
    for (const s of PROJECT_STAGES) expect(isProjectStage(s.id)).toBe(true);
  });

  it("rejects an arbitrary/unknown string, including a stale 'active'/'done' status value", () => {
    expect(isProjectStage("active")).toBe(false);
    expect(isProjectStage("done")).toBe(false);
    expect(isProjectStage("approved")).toBe(false);
    expect(isProjectStage("")).toBe(false);
  });
});

describe("getProjectStageMeta", () => {
  it("returns the matching stage meta", () => {
    expect(getProjectStageMeta("client_review").label).toBe("Client review");
  });

  it("falls back to the first stage (not_started) for an unknown value, never throws", () => {
    expect(getProjectStageMeta("nonsense").id).toBe("not_started");
  });
});

describe("deriveProjectStatus — the additive-column migration's whole safety contract", () => {
  it("maps 'completed' to 'done'", () => {
    expect(deriveProjectStatus("completed")).toBe("done");
  });

  it("maps every other real stage to 'active'", () => {
    expect(deriveProjectStatus("not_started")).toBe("active");
    expect(deriveProjectStatus("in_progress")).toBe("active");
    expect(deriveProjectStatus("internal_review")).toBe("active");
    expect(deriveProjectStatus("client_review")).toBe("active");
  });

  it("fails safe to 'active' for an unrecognised stage value, not 'done'", () => {
    expect(deriveProjectStatus("bogus")).toBe("active");
  });
});

describe("PORTAL_PROJECT_STAGE_META", () => {
  it("never leaks the internal 'Internal review' label — client-facing copy only", () => {
    const labels = Object.values(PORTAL_PROJECT_STAGE_META).map((m) => m.label);
    expect(labels).not.toContain("Internal review");
    expect(PORTAL_PROJECT_STAGE_META.internal_review.label).toBe("In review");
  });

  it("gives client_review actionable client-facing copy", () => {
    expect(PORTAL_PROJECT_STAGE_META.client_review.label).toBe("Ready for your review");
  });

  it("has an entry for every real stage", () => {
    for (const s of PROJECT_STAGES) expect(PORTAL_PROJECT_STAGE_META[s.id]).toBeDefined();
  });
});
