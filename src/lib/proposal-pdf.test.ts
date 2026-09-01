import { describe, it, expect } from "vitest";
import { renderProposalPdf } from "./proposal-pdf";

// The one thing worth verifying directly for a brand-new dependency
// (@react-pdf/renderer) in this project's actual build/test environment:
// that it renders a real PDF at all, not just that the code compiles.
// Content correctness (the right sections, the right prices) is
// exercised by rate-card.test.ts's own formatting tests and by reading
// the component itself — a binary PDF byte stream isn't a meaningful
// thing to assert exact content against.
describe("renderProposalPdf", () => {
  it("renders a real PDF buffer starting with the PDF file signature", async () => {
    const pdf = await renderProposalPdf({
      orgName: "Test Agency",
      accentColor: "#2f6fe4",
      prospectBusinessName: "Acme Cafe",
      proposalOutline: { overview: "A short overview.", included: ["Website build", "SEO setup"], timeline_note: "4-6 weeks." },
      rateCard: [{ label: "Website build", pricePence: 150000, unit: "one-off" }],
      contactEmail: "owner@testagency.example",
    });

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(500);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("renders without a rate card or contact email — both are optional", async () => {
    const pdf = await renderProposalPdf({
      orgName: "Test Agency",
      accentColor: null,
      prospectBusinessName: "Acme Cafe",
      proposalOutline: { overview: "A short overview.", included: [], timeline_note: "4-6 weeks." },
      rateCard: [],
      contactEmail: null,
    });

    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
