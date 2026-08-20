"use client";

import { useState, useTransition } from "react";
import { Download, ShieldAlert, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestAccountDeletion } from "@/app/studio/(authed)/settings/actions";

// GDPR minimum-viable compliance, part 3 (UI) — export is a plain link to
// /api/platform/export-data (a real file download, no client state
// needed); deletion is request-mediated, same type-to-confirm weight as
// DeleteClientControl in clients-panel.tsx, since this destroys an
// entire org rather than one client.
export function DataPrivacyPanel({ orgName, deletionRequestedAt }: { orgName: string; deletionRequestedAt: string | null }) {
  const [confirming, setConfirming] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [requestedAt, setRequestedAt] = useState(deletionRequestedAt);

  const nameMatches = typedName.trim() === orgName;

  return (
    <Card>
      <CardContent>
        <p className="flex items-center gap-2.5 font-heading text-sm font-semibold">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <ShieldAlert className="size-4" />
          </span>
          Data &amp; privacy
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Export your data</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Everything held about your organisation — prospects, clients, requests, invoices — as a JSON file.
            </p>
          </div>
          <Button size="sm" variant="outline" render={<a href="/api/platform/export-data" />}>
            <Download className="size-3.5" /> Export
          </Button>
        </div>

        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm font-medium text-destructive">Delete your account</p>
          {requestedAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Deletion requested {new Date(requestedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} —
              we&apos;ll be in touch to complete it.
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                Permanently deletes your organisation and everything in it. This goes to us as a request, not an
                instant action — we&apos;ll confirm with you before anything is actually removed.
              </p>
              {!confirming ? (
                <Button size="sm" variant="ghost" className="mt-2 text-destructive hover:text-destructive" onClick={() => setConfirming(true)}>
                  <Trash2 className="size-3.5" /> Request deletion
                </Button>
              ) : (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    Type <span className="font-mono font-medium text-foreground">{orgName}</span> to confirm.
                  </p>
                  <Input value={typedName} onChange={(e) => setTypedName(e.target.value)} className="mt-1.5 h-8 text-sm" autoFocus />
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!nameMatches || pending}
                      onClick={() =>
                        startTransition(async () => {
                          setError(null);
                          const r = await requestAccountDeletion();
                          if (r && "error" in r) setError(r.error ?? "Failed to submit the request.");
                          else if (r && "requestedAt" in r) setRequestedAt(r.requestedAt);
                        })
                      }
                    >
                      {pending ? "Submitting…" : "Request deletion"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                      Cancel
                    </Button>
                  </div>
                  {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
