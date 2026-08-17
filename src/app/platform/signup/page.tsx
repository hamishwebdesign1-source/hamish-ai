"use client";

import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Eyebrow } from "@/components/eyebrow";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Same magic-link pattern as /portal/login — no password, one shared auth
// mechanism for both client and Agency Platform sign-in. What differs is
// only the redirect target: /api/platform/callback decides whether this
// email already has an organisation (→ /studio) or needs the onboarding
// wizard first (→ /platform/onboarding), where /api/portal/callback
// always sends a matched client straight to /portal.
export default function PlatformSignupPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/platform/callback` },
    });

    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-6">
      <Card className="w-full max-w-sm p-2">
        <CardContent>
          <Eyebrow>HamishAI Agency Platform</Eyebrow>
          <h1 className="mt-3 font-heading text-2xl font-semibold">Get early access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a sign-in link — no password needed. First time here, you&apos;ll
            set up your agency straight after.
          </p>

          {status === "sent" ? (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3.5 text-sm">
              <MailCheck className="mt-0.5 size-4 shrink-0 text-accent" />
              <p>Check your email for a sign-in link — it&apos;ll take you straight in.</p>
            </div>
          ) : (
            <form onSubmit={sendLink} className="mt-6 space-y-3">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@youragency.com"
                autoFocus
                className="h-10"
              />
              <Button type="submit" disabled={status === "sending"} className="h-10 w-full">
                {status === "sending" ? "Sending…" : "Send me a login link"}
              </Button>
              {status === "error" && (
                <p className="text-sm text-destructive">Something went wrong — please try again.</p>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
