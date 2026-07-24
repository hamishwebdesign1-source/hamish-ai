"use client";

import { useState } from "react";
import { Activity, CheckCircle2, XCircle } from "lucide-react";

type SiteCheck = {
  uptime_ok: boolean;
  response_ms: number | null;
  ssl_ok: boolean | null;
  ssl_valid_until: string | null;
  broken_links: { url: string; status: number | null }[];
  ai_summary: string;
};

export function SiteCheckButton({ clientId, latestCheck }: { clientId: string; latestCheck: SiteCheck | null }) {
  const [loading, setLoading] = useState(false);
  const [check, setCheck] = useState<SiteCheck | null>(latestCheck);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/internal/site-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setCheck(data.check);
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-medium">Website health</h2>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
        >
          <Activity className="size-3.5" />
          {loading ? "Checking…" : "Run site check"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {check && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-1.5">
              {check.uptime_ok ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <XCircle className="size-4 text-destructive" />
              )}
              <span>{check.uptime_ok ? "Site is up" : "Site unreachable"}</span>
            </div>
            {check.response_ms != null && (
              <div className="text-muted-foreground">{check.response_ms}ms response</div>
            )}
            {check.ssl_ok !== null && (
              <div className="flex items-center gap-1.5">
                {check.ssl_ok ? (
                  <CheckCircle2 className="size-4 text-emerald-500" />
                ) : (
                  <XCircle className="size-4 text-destructive" />
                )}
                <span>
                  {check.ssl_ok
                    ? `SSL valid until ${new Date(check.ssl_valid_until!).toLocaleDateString()}`
                    : "SSL invalid"}
                </span>
              </div>
            )}
          </div>

          {check.broken_links?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-destructive uppercase">Broken links</p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {check.broken_links.map((link) => (
                  <li key={link.url}>
                    {link.url} {link.status ? `(${link.status})` : "(unreachable)"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {check.ai_summary && <p className="text-sm text-foreground">{check.ai_summary}</p>}
        </div>
      )}

      {!check && !error && !loading && (
        <p className="mt-3 text-sm text-muted-foreground">
          Checks uptime, SSL, and broken links, then writes a plain-English summary.
        </p>
      )}
    </div>
  );
}
