export const invoiceStatusMeta: Record<
  string,
  { label: string; variant: "secondary" | "warning" | "success" | "destructive" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  open: { label: "Awaiting payment", variant: "warning" },
  paid: { label: "Paid", variant: "success" },
  void: { label: "Void", variant: "secondary" },
  uncollectible: { label: "Uncollectible", variant: "destructive" },
};

export function isInvoiceOverdue(inv: { status: string; due_date: string | null }) {
  return inv.status === "open" && !!inv.due_date && inv.due_date < new Date().toISOString().slice(0, 10);
}

export function getInvoiceDisplay(inv: { status: string; due_date: string | null }) {
  if (isInvoiceOverdue(inv)) return { label: "Overdue", variant: "destructive" as const };
  return invoiceStatusMeta[inv.status] ?? invoiceStatusMeta.draft;
}
