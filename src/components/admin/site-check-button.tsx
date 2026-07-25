"use client";

import { useState } from "react";
import { Activity, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <Card>
      <CardHeader className="flex items-center justify-between gap-3 space-y-0">
        <CardTitle>Website health</CardTitle>
        <Button type="button" onClick={run} disabled={loading} variant="outline" size="sm">
          <Activity className="size-3.5" />
          {loading ? "Checking…" : "Run check"}
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {check && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="flex items-center gap-1.5">
                {check.uptime_ok ? (
                  <CheckCircle2 className="size-4 text-success" />
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
                    <CheckCircle2 className="size-4 text-success" />
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
          <p className="text-sm text-muted-foreground">
            Checks uptime, SSL, and broken links, then writes a plain-English summary.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
