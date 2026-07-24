"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

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
    <div className="rounded-xl border border-border p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-medium">Progress report</h2>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
        >
          <Sparkles className="size-3.5" />
          {loading ? "Generating…" : "Generate progress report"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {report && <p className="mt-3 whitespace-pre-line text-sm text-foreground">{report}</p>}
      {!report && !error && !loading && (
        <p className="mt-3 text-sm text-muted-foreground">
          Generate an AI-written summary of what&apos;s been done, what&apos;s outstanding, and any risks.
        </p>
      )}
    </div>
  );
}
