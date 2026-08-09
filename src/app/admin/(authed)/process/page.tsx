import Link from "next/link";
import { BookOpenText, FileDown, ClipboardCheck } from "lucide-react";
import { ProcessDiagram } from "@/components/admin/process-diagram";
import { ProcessSteps } from "@/components/admin/process-steps";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PDF_HREF = "/docs/HamishAI-Business-Analysis-Documentation-Pack.pdf";

export default function AdminProcessPage() {
  return (
    <div>
      <h1 className="text-page-title">Process map</h1>
      <p className="text-page-subtitle mt-1">
        End-to-end view of how a prospect becomes a lead, a client, a request, and an invoice — and where each
        automation feeds the Overview dashboard.
      </p>

      <div className="mt-8">
        <h2 className="text-section-title">The 7 stages, in plain English</h2>
        <p className="text-page-subtitle mt-1">
          Expand a stage for what actually happens, step by step — no diagram-reading required.
        </p>
        <div className="mt-4">
          <ProcessSteps />
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-section-title">The same process, as a flowchart</h2>
        <p className="text-page-subtitle mt-1">
          Every branch, decision point, and automation trigger behind the stages above.
        </p>
        <div className="mt-4">
          <ProcessDiagram />
        </div>
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
            <Button render={<Link href="/admin/process/documentation" />}>
              <BookOpenText className="size-4" />
              View documentation
            </Button>
            <Button variant="outline" render={<a href={PDF_HREF} download />}>
              <FileDown className="size-4" />
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>What we&apos;d need from a client</CardTitle>
          <CardDescription>
            For every offering on the site to be reality rather than a demo — grouped by how hard that ask actually
            is, so the sales conversation sets the right expectation up front.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/admin/process/client-requirements" />}>
            <ClipboardCheck className="size-4" />
            View requirements by offering
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
