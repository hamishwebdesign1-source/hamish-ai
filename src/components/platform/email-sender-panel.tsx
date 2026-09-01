"use client";

import { useState, useTransition } from "react";
import { Mail, X, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateReplyToEmail, clearReplyToEmail, updateAutonomousOutreach } from "@/app/studio/(authed)/settings/actions";

// Roadmap item #1 — the one Studio-side control for send-org-email.ts's
// per-tenant identity. Same resting/pending/saved/error shape as
// BrandingPanel, and the same "never rendered for HamishAI's own internal
// org" gate one level up in settings/page.tsx: HamishAI already sends
// under its own name via sendClientEmail(), it has no reply-to to set.
export function EmailSenderPanel({
  replyToEmail,
  autonomousOutreachEnabled,
}: {
  replyToEmail: string | null;
  autonomousOutreachEnabled: boolean;
}) {
  const [email, setEmail] = useState(replyToEmail ?? "");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const [cadenceEnabled, setCadenceEnabled] = useState(autonomousOutreachEnabled);
  const [cadencePending, startCadenceTransition] = useTransition();
  const [cadenceError, setCadenceError] = useState<string | null>(null);

  function save() {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const r = await updateReplyToEmail(email);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to save.");
      } else {
        setStatus("saved");
      }
    });
  }

  function clear() {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const r = await clearReplyToEmail();
      if (r && "error" in r) {
        setError(r.error ?? "Failed to clear.");
      } else {
        setEmail("");
        setCadenceEnabled(false);
        setStatus("saved");
      }
    });
  }

  function toggleCadence(next: boolean) {
    setCadenceError(null);
    startCadenceTransition(async () => {
      const r = await updateAutonomousOutreach(next);
      if (r && "error" in r) {
        setCadenceError(r.error ?? "Failed to save.");
      } else {
        setCadenceEnabled(next);
      }
    });
  }

  return (
    <Card>
      <CardContent>
        <p className="flex items-center gap-2.5 font-heading text-sm font-semibold">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Mail className="size-4" />
          </span>
          Email replies go to
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Set this to unlock sending emails to your own clients (like payment reminders) under your business&apos;s
          name instead of Hamish AI&apos;s. Any reply lands here, in your own inbox — not ours.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourbusiness.com"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
          <Button size="sm" disabled={pending || !email.trim()} onClick={save}>
            {pending ? "Saving…" : "Save"}
          </Button>
          {replyToEmail && (
            <Button size="sm" variant="ghost" disabled={pending} onClick={clear}>
              <X className="size-3.5" /> Clear
            </Button>
          )}
        </div>
        {status === "saved" && <p className="mt-2 text-xs text-accent">Saved.</p>}
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

        {/* Roadmap item #2 — only offered once there's a real reply-to to
            send under; an org that hasn't set one can't turn this on
            (updateAutonomousOutreach() refuses it server-side too). */}
        {replyToEmail && (
          <div className="mt-5 border-t border-border pt-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={cadenceEnabled}
                disabled={cadencePending}
                onChange={(e) => toggleCadence(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-accent"
              />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Zap className="size-3.5 shrink-0 text-accent" /> Send follow-up emails automatically
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  When a prospect you&apos;ve already emailed and called still hasn&apos;t replied, HamishAI sends
                  the one follow-up email your own sales kit already drafted for them — no click needed. It never
                  invents a message: if a prospect doesn&apos;t have a follow-up drafted yet, it&apos;s left for
                  you in Prospects as usual.
                </span>
              </span>
            </label>
            {cadenceError && <p className="mt-2 text-xs text-destructive">{cadenceError}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
