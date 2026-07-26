"use client";

import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AdminMagicLinkForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/internal/admin-callback` },
    });

    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3.5 text-sm">
        <MailCheck className="mt-0.5 size-4 shrink-0 text-accent" />
        <p>Check your email for a sign-in link — it&apos;ll take you straight in.</p>
      </div>
    );
  }

  return (
    <form onSubmit={sendLink} className="space-y-3">
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@yourbusiness.com"
        className="h-10"
      />
      <Button type="submit" disabled={status === "sending"} variant="outline" className="h-10 w-full">
        {status === "sending" ? "Sending…" : "Email me a login link"}
      </Button>
      {status === "error" && <p className="text-sm text-destructive">Something went wrong — please try again.</p>}
    </form>
  );
}
