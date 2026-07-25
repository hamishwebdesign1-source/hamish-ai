"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ProgressReportButton({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/internal/progress-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setReport(data.report);
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3 space-y-0">
        <CardTitle>Progress report</CardTitle>
        <Button type="button" onClick={generate} disabled={loading} variant="outline" size="sm">
          <Sparkles className="size-3.5" />
          {loading ? "Generating…" : "Generate"}
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {report && <p className="whitespace-pre-line text-sm text-foreground">{report}</p>}
        {!report && !error && !loading && (
          <p className="text-sm text-muted-foreground">
            Generate an AI-written summary of what&apos;s been done, what&apos;s outstanding, and any risks.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
