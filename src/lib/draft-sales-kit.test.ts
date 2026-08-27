import { describe, it, expect } from "vitest";
import { stripKit, isWellFormed } from "./draft-sales-kit";
import type { SalesKit } from "./draft-sales-kit";

function kit(overrides: Partial<SalesKit> = {}): SalesKit {
  return {
    outreach_email: { subject: "Subject", body: "Body" },
    follow_up_email: { subject: "Follow up", body: "Following up" },
    call_script: { opener: "Hi", talking_points: ["Point one"], if_hesitant: "Reassure", closing_ask: "Book a call?" },
    linkedin_message: "Hi there",
    meeting_agenda: ["Intro"],
    proposal_outline: { overview: "Overview", included: ["Item"], timeline_note: "2 weeks" },
    ...overrides,
  };
}

describe("stripKit", () => {
  it("strips markdown emphasis from every text field across the kit", () => {
    const result = stripKit(
      kit({
        outreach_email: { subject: "**Big** opportunity", body: "Hi *there*" },
        linkedin_message: "**Bold** message",
      })
    );
    expect(result.outreach_email.subject).toBe("Big opportunity");
    expect(result.outreach_email.body).toBe("Hi there");
    expect(result.linkedin_message).toBe("Bold message");
  });

  it("strips markdown from every item in the array fields (talking points, agenda, included)", () => {
    const result = stripKit(
      kit({
        call_script: { opener: "Hi", talking_points: ["**Point one**", "*Point two*"], if_hesitant: "x", closing_ask: "y" },
        meeting_agenda: ["**Intro**"],
        proposal_outline: { overview: "x", included: ["**Item one**"], timeline_note: "y" },
      })
    );
    expect(result.call_script.talking_points).toEqual(["Point one", "Point two"]);
    expect(result.meeting_agenda).toEqual(["Intro"]);
    expect(result.proposal_outline.included).toEqual(["Item one"]);
  });

  it("leaves already-plain text completely unchanged", () => {
    const plain = kit();
    expect(stripKit(plain)).toEqual(plain);
  });

  // Real-improvement pass — stripKit() used to assume its input already
  // matched SalesKit's shape and threw on anything malformed, a narrower
  // contract than its siblings stripBrief()/reconcilePhases(). Brought up
  // to the same "never trust structurally" standard: every field is
  // coerced defensively, nothing throws.
  it("coerces a missing required array field to an empty array rather than throwing", () => {
    const malformed = { ...kit(), call_script: { opener: "Hi", if_hesitant: "x", closing_ask: "y" } };
    const result = stripKit(malformed);
    expect(result.call_script.talking_points).toEqual([]);
  });

  it("defaults every field to empty when given completely garbage input", () => {
    expect(stripKit("not an object")).toEqual({
      outreach_email: { subject: "", body: "" },
      follow_up_email: { subject: "", body: "" },
      call_script: { opener: "", talking_points: [], if_hesitant: "", closing_ask: "" },
      linkedin_message: "",
      meeting_agenda: [],
      proposal_outline: { overview: "", included: [], timeline_note: "" },
    });
  });

  it("drops non-string entries out of an array field rather than crashing", () => {
    const result = stripKit(kit({ meeting_agenda: ["Real item", 42, null, "Another real item"] as unknown as string[] }));
    expect(result.meeting_agenda).toEqual(["Real item", "Another real item"]);
  });

  it("coerces a bare string into a single-item array for an array field", () => {
    const result = stripKit(kit({ meeting_agenda: "Just one item" as unknown as string[] }));
    expect(result.meeting_agenda).toEqual(["Just one item"]);
  });

  it("handles null/undefined input the same as an empty object", () => {
    expect(stripKit(null)).toEqual(stripKit({}));
    expect(stripKit(undefined)).toEqual(stripKit({}));
  });
});

describe("isWellFormed", () => {
  it("is true for a fully populated kit", () => {
    expect(isWellFormed(kit())).toBe(true);
  });

  it("is false when any required text field is empty", () => {
    expect(isWellFormed(kit({ linkedin_message: "" }))).toBe(false);
    expect(isWellFormed(kit({ call_script: { opener: "", talking_points: ["x"], if_hesitant: "y", closing_ask: "z" } }))).toBe(false);
  });

  it("is false when any required array field is empty", () => {
    expect(isWellFormed(kit({ meeting_agenda: [] }))).toBe(false);
    expect(isWellFormed(kit({ proposal_outline: { overview: "x", included: [], timeline_note: "y" } }))).toBe(false);
  });

  it("agrees with stripKit's own output on malformed input — never well-formed", () => {
    expect(isWellFormed(stripKit("garbage"))).toBe(false);
  });
});
