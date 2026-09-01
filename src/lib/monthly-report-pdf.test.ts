import { describe, it, expect } from "vitest";
import { renderMonthlyReportPdf } from "./monthly-report-pdf";

// Same "verify the new dependency actually renders in this project's own
// environment" reasoning as proposal-pdf.test.ts — a binary PDF isn't a
// meaningful thing to assert exact content against beyond that.
describe("renderMonthlyReportPdf", () => {
  it("renders a real PDF buffer starting with the PDF file signature", async () => {
    const pdf = await renderMonthlyReportPdf({
      orgName: "Test Agency",
      accentColor: "#2f6fe4",
      clientBusinessName: "Acme Cafe",
      periodLabel: "August 2026",
      snapshot: {
        healthScore: 82,
        components: [{ label: "Response time", value: 90 }],
        requestsTotal: 4,
        requestsCompleted: 3,
        tasksTotal: 6,
        tasksCompleted: 5,
        spendPence: 15000,
        uptimePct: 99,
      },
    });

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(500);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("renders with no health score and no spend — both are optional", async () => {
    const pdf = await renderMonthlyReportPdf({
      orgName: "Test Agency",
      accentColor: null,
      clientBusinessName: "Acme Cafe",
      periodLabel: "August 2026",
      snapshot: {
        healthScore: null,
        components: [],
        requestsTotal: 0,
        requestsCompleted: 0,
        tasksTotal: 0,
        tasksCompleted: 0,
        spendPence: 0,
        uptimePct: null,
      },
    });

    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
