"use client";

import { useState, useTransition } from "react";
import { Mail, Unplug, RefreshCw, LoaderCircle, CircleAlert, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { disconnectInbox, runReplyCheck } from "@/app/studio/(authed)/settings/actions";
import { timeAgo } from "@/lib/time-ago";

type Connection = { email_address: string; connected_at: string; last_checked_at: string | null } | null;

// A single client component for connect status + the two actions it
// enables (disconnect, check for replies) — mirrors ProspectingPanel's
// shape: server component reads, this one writes, connected by props.
export function SettingsPanel({
  connection,
  configured,
  connectHref,
}: {
  connection: Connection;
  configured: boolean;
  connectHref: string;
}) {
  const [disconnectPending, startDisconnect] = useTransition();
  const [checkPending, startCheck] = useTransition();
  const [checkResult, setCheckResult] = useState<Awaited<ReturnType<typeof runReplyCheck>> | null>(null);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2.5 font-heading text-sm font-semibold">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Mail className="size-4" />
            </span>
            Connected inbox
          </p>
          {connection ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="size-3" /> Connected
            </Badge>
          ) : (
            <Badge variant="secondary">Not connected</Badge>
          )}
        </div>

        {!configured ? (
          <p className="mt-3 text-sm text-muted-foreground">Inbox connections aren&apos;t set up on this platform yet.</p>
        ) : connection ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Connected as <span className="font-medium text-foreground">{connection.email_address}</span>. Used
              read-only to check whether a prospect you&apos;ve marked contacted has replied — nothing is sent from
              this inbox, and nothing but message existence and timestamp is read.
            </p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Connected {timeAgo(connection.connected_at)}
              {connection.last_checked_at ? ` · last checked ${timeAgo(connection.last_checked_at)}` : " · not checked yet"}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                disabled={checkPending}
                onClick={() =>
                  startCheck(async () => {
                    setCheckResult(null);
                    const r = await runReplyCheck();
                    setCheckResult(r);
                  })
                }
              >
                {checkPending ? (
                  <>
                    <LoaderCircle className="size-3.5 animate-spin" /> Checking…
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-3.5" /> Check for replies now
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={disconnectPending}
                onClick={() =>
                  startDisconnect(async () => {
                    setDisconnectError(null);
                    const r = await disconnectInbox();
                    if (r && "error" in r) setDisconnectError(r.error ?? "Failed to disconnect.");
                  })
                }
              >
                <Unplug className="size-3.5" /> Disconnect
              </Button>
            </div>
            {checkResult && "error" in checkResult && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <CircleAlert className="size-3.5 shrink-0" /> {checkResult.error}
              </p>
            )}
            {checkResult && "checked" in checkResult && (
              <p className="mt-2 text-xs text-accent">
                Checked {checkResult.checked} contacted prospect{checkResult.checked === 1 ? "" : "s"} — found{" "}
                {checkResult.matched} repl{checkResult.matched === 1 ? "y" : "ies"}.
              </p>
            )}
            {disconnectError && <p className="mt-2 text-xs text-destructive">{disconnectError}</p>}
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Connect your Outlook or Microsoft 365 inbox so prospects who reply to your outreach are marked
              automatically, instead of by hand. Read-only — nothing is ever sent from it. Gmail isn&apos;t
              supported yet.
            </p>
            <Button size="sm" className="mt-4" render={<a href={connectHref} />}>
              <Mail className="size-3.5" /> Connect Outlook
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
