import { FileText, Receipt, CheckCircle2 } from "lucide-react";

// /platform hero rebuild, sections 06-07 from the brief (prove the
// value, then get paid) — folded into one compact pairing rather than
// two separate sections, since the actual product point is that both
// come from the same job data, not two different tools.

export function ReportInvoicePreview() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <FileText className="size-3.5" />
          </span>
          <p className="text-xs font-semibold">Monthly report</p>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Coastal Practice Group — October</p>
        <div className="mt-2 flex items-baseline gap-1">
          <p className="font-heading text-lg font-semibold text-success tabular-nums">+38%</p>
          <p className="text-[11px] text-muted-foreground">website leads vs. last month</p>
        </div>
        <p className="mt-2 font-mono text-[9px] tracking-wide text-muted-foreground uppercase">Generated automatically</p>
      </div>
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Receipt className="size-3.5" />
          </span>
          <p className="text-xs font-semibold">Invoice #0142</p>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Coastal Practice Group — Monthly retainer</p>
        <div className="mt-2 flex items-center justify-between">
          <p className="font-heading text-lg font-semibold tabular-nums">£450.00</p>
          <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
            <CheckCircle2 className="size-3" /> Paid
          </span>
        </div>
        <p className="mt-2 font-mono text-[9px] tracking-wide text-muted-foreground uppercase">From the same job data</p>
      </div>
    </div>
  );
}
