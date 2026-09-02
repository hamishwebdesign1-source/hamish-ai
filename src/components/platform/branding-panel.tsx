"use client";

import { useState, useTransition } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateBrandAccent, resetBrandAccent } from "@/app/studio/(authed)/settings/actions";

// Roughly matches --accent's oklch(0.58 0.21 258) as a hex fallback — only
// used to seed the colour picker when an org hasn't set one yet; saving
// with this value untouched is indistinguishable from not setting one, so
// there's no risk of accidentally locking an org into "their own" colour
// that's actually just the shared default.
const DEFAULT_ACCENT = "#2f6fe4";

// Writes into organisations.brand.accentColor — already a real, working
// pipeline (getPortalOrgBranding → the portal layout's own --accent CSS
// var override), this is the first Studio-side UI to actually set it.
// Never rendered for HamishAI's own internal org: getPortalOrgBranding()
// ignores brand.accentColor entirely for is_internal orgs (the portal
// always shows as "HamishAI"), so a colour picker here would be a control
// that visibly does nothing — the isInternal check happens one level up,
// in settings/page.tsx, which simply doesn't render this component.
//
// Pricing-promise audit (2026-09-02) — platform-plans.ts's own Starter
// tier promises "HamishAI-branded client portal" and Professional
// promises "Your own logo and accent colour" as a real differentiator,
// but this control had no plan gate at all: a Starter tenant could
// already override the portal's accent colour, same as Professional/
// Agency. `locked`/`upgradeReason` close that gap — same rendering
// convention as TeamPanel's own seats-full state (keep the panel
// visible so the feature is discoverable, replace the interactive
// control with an upgrade message + badge, rather than hiding the
// section outright).
export function BrandingPanel({
  accentColor,
  locked,
  upgradeReason,
}: {
  accentColor: string | null;
  locked?: boolean;
  upgradeReason?: string;
}) {
  const [color, setColor] = useState(accentColor ?? DEFAULT_ACCENT);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function save() {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const r = await updateBrandAccent(color);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to save.");
      } else {
        setStatus("saved");
      }
    });
  }

  function reset() {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const r = await resetBrandAccent();
      if (r && "error" in r) {
        setError(r.error ?? "Failed to reset.");
      } else {
        setColor(DEFAULT_ACCENT);
        setStatus("saved");
      }
    });
  }

  return (
    <Card>
      <CardContent>
        <p className="flex items-center gap-2.5 font-heading text-sm font-semibold">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Palette className="size-4" />
          </span>
          Portal colour
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          The accent colour your own clients see on their branded portal at{" "}
          <span className="font-mono text-xs">hamishai.org/portal</span> — buttons, links, highlights. Only their
          side; your own Studio workspace stays as it is.
        </p>
        {locked ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-secondary/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">{upgradeReason}</p>
            <Badge variant="secondary">Upgrade to unlock</Badge>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="size-10 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
              aria-label="Portal accent colour"
            />
            <span className="font-mono text-xs text-muted-foreground uppercase">{color}</span>
            <Button size="sm" disabled={pending} onClick={save}>
              {pending ? "Saving…" : "Save colour"}
            </Button>
            {accentColor && (
              <Button size="sm" variant="ghost" disabled={pending} onClick={reset}>
                <RotateCcw className="size-3.5" /> Reset to default
              </Button>
            )}
          </div>
        )}
        {!locked && status === "saved" && (
          <p className="mt-2 text-xs text-accent">Saved — your clients&apos; portal updates immediately.</p>
        )}
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
