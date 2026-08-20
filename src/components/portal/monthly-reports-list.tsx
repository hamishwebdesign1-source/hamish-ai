import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { monthLabelFromDateStr } from "@/lib/portal-events";

export type MonthlyReportRow = {
  id: string;
  period_start: string;
  period_end: string;
  snapshot: {
    healthScore: number | null;
    requestsTotal: number;
    requestsCompleted: number;
    tasksTotal: number;
    tasksCompleted: number;
    spendPence: number;
    uptimePct: number | null;
  };
};

function healthVariant(score: number | null): "success" | "warning" | "destructive" | "secondary" {
  if (score === null) return "secondary";
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "destructive";
}

// P1 platform readiness item — a dated, packaged snapshot, distinct from
// the live Insights charts above it: this month's report reads the same
// in six months as it did the day it was generated, even as the live
// numbers above keep moving. Server component — reports are plain rows,
// no interactivity needed here.
export function MonthlyReportsList({ reports }: { reports: MonthlyReportRow[] }) {
  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <FileText className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Your first monthly report lands here at the start of next month.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <p className="text-sm font-medium">{monthLabelFromDateStr(r.period_start)}</p>
              <Badge variant={healthVariant(r.snapshot.healthScore)}>
                {r.snapshot.healthScore === null ? "No data" : `${r.snapshot.healthScore}% health`}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
              <span>{r.snapshot.requestsCompleted}/{r.snapshot.requestsTotal} requests handled</span>
              <span>{r.snapshot.tasksCompleted}/{r.snapshot.tasksTotal} tasks done</span>
              {r.snapshot.uptimePct !== null && <span>{r.snapshot.uptimePct}% uptime</span>}
              {r.snapshot.spendPence > 0 && <span>£{(r.snapshot.spendPence / 100).toFixed(2)} spent</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
