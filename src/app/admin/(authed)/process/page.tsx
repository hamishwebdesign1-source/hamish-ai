import { FileText, FileDown } from "lucide-react";
import { ProcessDiagram } from "@/components/admin/process-diagram";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DOCX_HREF = "/docs/HamishAI-Business-Analysis-Documentation-Pack.docx";
const PDF_HREF = "/docs/HamishAI-Business-Analysis-Documentation-Pack.pdf";

export default function AdminProcessPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Process map</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        End-to-end view of how a prospect becomes a lead, a client, a request, and an invoice — and where each
        automation feeds the Overview dashboard.
      </p>

      <div className="mt-8">
        <ProcessDiagram />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Documentation pack</CardTitle>
          <CardDescription>
            The full Business Analysis pack behind this model — stakeholder register, requirements, use cases, RAID
            log, RACI, traceability matrix and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button render={<a href={PDF_HREF} download />}>
              <FileDown className="size-4" />
              Download PDF
            </Button>
            <Button variant="outline" render={<a href={DOCX_HREF} download />}>
              <FileText className="size-4" />
              Download Word (.docx)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
