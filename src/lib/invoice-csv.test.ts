import { describe, it, expect } from "vitest";
import { buildInvoiceCsv, type InvoiceCsvRow } from "./invoice-csv";

function invoice(overrides: Partial<InvoiceCsvRow> = {}): InvoiceCsvRow {
  return {
    description: "Website maintenance",
    amount_pence: 15000,
    status: "paid",
    due_date: "2026-08-01",
    paid_at: "2026-07-28T10:00:00Z",
    ...overrides,
  };
}

describe("buildInvoiceCsv", () => {
  it("includes the business name in the header", () => {
    const csv = buildInvoiceCsv("Acme Cafe", []);
    expect(csv).toContain("Invoice history,Acme Cafe");
  });

  it("converts the amount from pence to pounds", () => {
    const csv = buildInvoiceCsv("Acme Cafe", [invoice({ amount_pence: 150050 })]);
    expect(csv).toContain("1500.50");
  });

  it("includes description, status, due date, and paid date", () => {
    const csv = buildInvoiceCsv("Acme Cafe", [invoice()]);
    expect(csv).toContain("Website maintenance,150.00,paid,2026-08-01,2026-07-28");
  });

  it("leaves due date and paid date blank rather than as literal null/undefined text", () => {
    const csv = buildInvoiceCsv("Acme Cafe", [invoice({ status: "open", due_date: null, paid_at: null })]);
    expect(csv).toContain("Website maintenance,150.00,open,,");
  });

  it("quotes a description containing a comma rather than letting it split into two columns", () => {
    const csv = buildInvoiceCsv("Acme Cafe", [invoice({ description: "Setup, hosting" })]);
    expect(csv).toContain('"Setup, hosting"');
  });

  it("includes every invoice, in order", () => {
    const csv = buildInvoiceCsv("Acme Cafe", [invoice({ description: "First" }), invoice({ description: "Second" })]);
    const firstIndex = csv.indexOf("First");
    const secondIndex = csv.indexOf("Second");
    expect(firstIndex).toBeGreaterThan(-1);
    expect(secondIndex).toBeGreaterThan(firstIndex);
  });
});
