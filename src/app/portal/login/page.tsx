"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

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
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm">
        <p className="font-mono text-xs font-medium tracking-[0.15em] text-accent uppercase">
          Hamish<span className="text-foreground">AI</span> Client Portal
        </p>
        <h1 className="mt-2 font-heading text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the email your project is registered under and we&apos;ll send you a sign-in link — no password
          needed.
        </p>

        {status === "sent" ? (
          <p className="mt-6 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm">
            Check your email for a sign-in link — it&apos;ll take you straight in.
          </p>
        ) : (
          <form onSubmit={sendLink} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
              autoFocus
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="h-10 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : "Send me a login link"}
            </button>
            {status === "error" && (
              <p className="text-sm text-destructive">Something went wrong — please try again.</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
