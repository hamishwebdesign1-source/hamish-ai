"use client";

import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Eyebrow } from "@/components/eyebrow";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function PortalLoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/portal/callback` },
    });

    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-6">
      <Card className="w-full max-w-sm p-2">
        <CardContent>
          <Eyebrow>Client Portal</Eyebrow>
          <h1 className="mt-3 font-heading text-2xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the email your project is registered under and we&apos;ll send you a sign-in link — no password
            needed.
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
                placeholder="you@yourbusiness.com"
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
