import { describe, it, expect } from "vitest";
import { stripKit } from "./draft-sales-kit";
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

  // Documents the real, narrower contract vs. stripBrief()/reconcilePhases():
  // this function assumes its input already matches SalesKit's shape - it
  // has no defensive coercion for a malformed AI tool-call payload, unlike
  // its siblings in website-brief.ts and website-build-phases.ts.
  it("throws rather than degrading gracefully when a required array field is missing", () => {
    const malformed = { ...kit(), call_script: { opener: "Hi", if_hesitant: "x", closing_ask: "y" } } as unknown as SalesKit;
    expect(() => stripKit(malformed)).toThrow();
  });
});
