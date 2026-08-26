"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateOwnerDigestPreference } from "@/app/studio/(authed)/settings/actions";

// Command Centre improvement #2 — the opt-out for owner-digest.ts's
// weekly email. Same client-component + useTransition shape as
// BrandingPanel (a single real preference, one save action, one error
// state), not the raw <form action> the client portal's equivalent
// settings/page.tsx uses — Studio's settings actions return
// {error}/{ok} for a client component to react to, portal's don't.
export function NotificationsPanel({ enabled: initialEnabled }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !enabled;
    setError(null);
    startTransition(async () => {
      const r = await updateOwnerDigestPreference(next);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to save.");
        return;
      }
      setEnabled(next);
    });
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2.5 font-heading text-sm font-semibold">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Bell className="size-4" />
              </span>
              Weekly digest email
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Your Actions Required and Engagement Risk numbers, emailed to you once a week — sent only when
              something&apos;s actually outstanding, no empty &quot;all quiet&quot; emails.
            </p>
          </div>
          <Button size="sm" variant={enabled ? "default" : "outline"} disabled={pending} onClick={toggle}>
            {pending ? "Saving…" : enabled ? "On" : "Off"}
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
