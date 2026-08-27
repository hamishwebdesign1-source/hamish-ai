import { describe, it, expect } from "vitest";
import { reconcilePhases, isWellFormed, BUILD_PHASE_LABELS } from "./website-build-phases";

describe("reconcilePhases", () => {
  it("keeps a well-formed phase's real instructions and checklist", () => {
    const raw = [{ phaseId: "setup", instructions: "Do the setup.", checklist: ["Runs locally", "Git initialised"] }];
    const [phase] = reconcilePhases(raw, ["setup"]);
    expect(phase).toEqual({
      id: "setup",
      name: BUILD_PHASE_LABELS.setup,
      instructions: "Do the setup.",
      checklist: [{ item: "Runs locally", done: false }, { item: "Git initialised", done: false }],
    });
  });

  // This is the actual fix for the real production bug this file's own
  // header documents: a malformed/missing phase from the model must get a
  // real, honest fallback - never silently vanish, and never look like a
  // successful real result.
  it("gives a phase missing from the model's response a real fallback, not nothing", () => {
    const [phase] = reconcilePhases([], ["setup"]);
    expect(phase.id).toBe("setup");
    expect(phase.instructions).toContain("Project setup");
    expect(phase.checklist).toHaveLength(1);
  });

  it("falls back a phase whose instructions or checklist came back empty", () => {
    const raw = [{ phaseId: "setup", instructions: "", checklist: ["A real item"] }];
    const [phase] = reconcilePhases(raw, ["setup"]);
    expect(phase.instructions).toContain("Ask your AI coding agent to work on");
  });

  it("falls back a phase whose checklist came back as an empty array", () => {
    const raw = [{ phaseId: "setup", instructions: "Real instructions here.", checklist: [] }];
    const [phase] = reconcilePhases(raw, ["setup"]);
    expect(phase.instructions).toContain("Ask your AI coding agent to work on");
  });

  it("ignores an unrecognised phaseId and a non-string checklist entry rather than crashing", () => {
    const raw = [
      { phaseId: "not-a-real-phase", instructions: "x", checklist: ["y"] },
      { phaseId: "seo", instructions: "Do SEO.", checklist: ["Metadata set", 42, "Headings correct"] },
    ];
    const [phase] = reconcilePhases(raw, ["seo"]);
    expect(phase.checklist.map((c) => c.item)).toEqual(["Metadata set", "Headings correct"]);
  });

  it("returns phases in the requested order, not the raw response order", () => {
    const raw = [
      { phaseId: "qa", instructions: "QA work.", checklist: ["Checked"] },
      { phaseId: "setup", instructions: "Setup work.", checklist: ["Checked"] },
    ];
    const phases = reconcilePhases(raw, ["setup", "qa"]);
    expect(phases.map((p) => p.id)).toEqual(["setup", "qa"]);
  });

  it("handles a completely non-array raw response the same as an empty one", () => {
    const phases = reconcilePhases(undefined, ["setup", "seo"]);
    expect(phases).toHaveLength(2);
    expect(phases.every((p) => p.instructions.includes("Ask your AI coding agent to work on"))).toBe(true);
  });
});

describe("isWellFormed", () => {
  it("is true only when every phase has real content, not a fallback", () => {
    const wellFormed = reconcilePhases([{ phaseId: "setup", instructions: "Real.", checklist: ["A"] }], ["setup"]);
    expect(isWellFormed(wellFormed)).toBe(true);
  });

  it("is false when even one phase fell back to placeholder content", () => {
    const degraded = reconcilePhases([{ phaseId: "setup", instructions: "Real.", checklist: ["A"] }], ["setup", "seo"]);
    expect(isWellFormed(degraded)).toBe(false);
  });
});
