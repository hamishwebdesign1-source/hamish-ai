"use client";

import { useState, useTransition } from "react";
import { CalendarClock, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateBookingLink, clearBookingLink } from "@/app/studio/(authed)/settings/actions";

// Roadmap item #9 — see booking-link.ts's own comment for the full
// reasoning on why this is "paste your own scheduler link," not real
// calendar integration. Same resting/pending/saved/error shape as
// BrandingPanel/EmailSenderPanel.
export function BookingLinkPanel({ bookingLink }: { bookingLink: string | null }) {
  const [url, setUrl] = useState(bookingLink ?? "");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function save() {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const r = await updateBookingLink(url);
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
      const r = await clearBookingLink();
      if (r && "error" in r) {
        setError(r.error ?? "Failed to clear.");
      } else {
        setUrl("");
        setStatus("saved");
      }
    });
  }

  return (
    <Card>
      <CardContent>
        <p className="flex items-center gap-2.5 font-heading text-sm font-semibold">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <CalendarClock className="size-4" />
          </span>
          Booking link
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Your own Calendly, cal.com, or other scheduler link — added automatically to every AI-drafted outreach and
          follow-up email, so a reply converts straight to a booked call instead of another round of email.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://calendly.com/you/intro-call"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
          <Button size="sm" disabled={pending || !url.trim()} onClick={save}>
            {pending ? "Saving…" : "Save"}
          </Button>
          {bookingLink && (
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
