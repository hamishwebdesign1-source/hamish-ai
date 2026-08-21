"use client";

import { useState, useTransition } from "react";
import { Rocket, CheckCircle2, ExternalLink, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { launchWebsiteProject } from "@/app/studio/(authed)/website-builder/actions";

// AI Website Creation Guide, WB3 — the final stage. Only appears once
// every build phase's checklist is genuinely complete (or the project
// is already launched, so it can be edited afterward) — same
// progressive-reveal discipline as the rest of the pipeline, never a
// dead-end "what now" moment.
export function LaunchPanel({
  projectId,
  stage,
  liveUrl,
  analyticsConnected,
  allPhasesComplete,
}: {
  projectId: string;
  stage: string;
  liveUrl: string | null;
  analyticsConnected: boolean;
  allPhasesComplete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(liveUrl ?? "");
  const [analytics, setAnalytics] = useState(analyticsConnected);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!allPhasesComplete && stage !== "launched") return null;

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await launchWebsiteProject(projectId, url, analytics);
      if ("error" in r) setError(r.error);
      else setEditing(false);
    });
  }

  const isLaunched = stage === "launched" && !editing;

  return (
    <Card className="border-accent/40">
      <CardContent className="space-y-3">
        <p className="flex items-center gap-2 font-heading text-sm font-semibold">
          <Rocket className="size-4 shrink-0 text-accent" /> Launch
        </p>

        {isLaunched ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm text-accent">
              <CheckCircle2 className="size-4 shrink-0" /> Live
            </p>
            <a href={liveUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-accent underline underline-offset-2">
              {liveUrl} <ExternalLink className="size-3.5 shrink-0" />
            </a>
            <p className="text-xs text-muted-foreground">{analyticsConnected ? "Analytics connected" : "Analytics not yet connected"}</p>
            <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" /> Edit launch details
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Every phase is complete. Record where the site is actually live.</p>
            <div>
              <Label htmlFor="launch-url">Live website URL</Label>
              <Input id="launch-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="mt-1" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
              Analytics is connected
            </label>
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={pending} onClick={save}>
                {pending ? "Saving…" : "Mark as launched"}
              </Button>
              {stage === "launched" && (
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
