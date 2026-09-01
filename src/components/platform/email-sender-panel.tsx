"use client";

import { useState, useTransition } from "react";
import { Mail, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateReplyToEmail, clearReplyToEmail } from "@/app/studio/(authed)/settings/actions";

// Roadmap item #1 — the one Studio-side control for send-org-email.ts's
// per-tenant identity. Same resting/pending/saved/error shape as
// BrandingPanel, and the same "never rendered for HamishAI's own internal
// org" gate one level up in settings/page.tsx: HamishAI already sends
// under its own name via sendClientEmail(), it has no reply-to to set.
export function EmailSenderPanel({ replyToEmail }: { replyToEmail: string | null }) {
  const [email, setEmail] = useState(replyToEmail ?? "");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

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
        setStatus("saved");
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
      </CardContent>
    </Card>
  );
}
