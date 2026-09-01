"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildInvoiceCsv, type InvoiceCsvRow } from "@/lib/invoice-csv";

// Studio improvement — same client-side-only download pattern as
// analytics-panel.tsx's own downloadCsv(): no server round-trip, no new
// route, just the browser-native <a download> trick over data the page
// already fetched.
function downloadCsv(businessName: string, invoices: InvoiceCsvRow[]) {
  const csv = buildInvoiceCsv(businessName, invoices);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${businessName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function InvoiceHistoryExport({ businessName, invoices }: { businessName: string; invoices: InvoiceCsvRow[] }) {
  return (
    <Button size="sm" variant="outline" onClick={() => downloadCsv(businessName, invoices)}>
      <Download className="size-3.5" /> Download CSV
    </Button>
  );
}
