// Studio improvement — a client's own invoice history was already real
// data with nowhere to take it (a spreadsheet, an accountant) — the same
// gap analytics-csv.ts closed for Studio's own Analytics page, ported
// here for the portal-facing invoice list. Pure and exported on its own,
// same "testable without a browser" reasoning — the download itself
// (Blob/URL.createObjectURL) is a thin wrapper elsewhere around this
// string.

function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function row(fields: (string | number)[]): string {
  return fields.map((f) => escapeCsvField(String(f))).join(",") + "\r\n";
}

export type InvoiceCsvRow = {
  description: string;
  amount_pence: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
};

export function buildInvoiceCsv(businessName: string, invoices: InvoiceCsvRow[]): string {
  let csv = row(["Invoice history", businessName]);
  csv += "\r\n";
  csv += row(["Description", "Amount (£)", "Status", "Due date", "Paid date"]);
  for (const inv of invoices) {
    csv += row([inv.description, (inv.amount_pence / 100).toFixed(2), inv.status, inv.due_date ?? "", inv.paid_at ? inv.paid_at.slice(0, 10) : ""]);
  }
  return csv;
}
