import { ProcessDiagram } from "@/components/admin/process-diagram";

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
    </div>
  );
}
