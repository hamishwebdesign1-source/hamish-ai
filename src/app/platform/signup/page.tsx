"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Eyebrow } from "@/components/eyebrow";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Magic link stays as the fallback (still used by /portal/login), but
// Google is now the primary path for Agency Platform sign-in — real
// customer feedback was that email-a-link felt less like "a proper
// account" than a standard login. /api/platform/callback already
// handled both PKCE `code` (what OAuth returns) and `token_hash`+`type`
// (what magic link returns) before this change — signInWithOAuth() just
// exercises the code path that route already had, no backend change
// needed. Decides whether this email already has an organisation
// (→ /studio) or needs the onboarding wizard first (→ /platform/onboarding).
//
// Requires Google enabled as a provider in the Supabase dashboard
// (Authentication → Providers → Google) with its own Google Cloud OAuth
// Client ID/Secret — deliberately not the GOOGLE_CLIENT_ID/SECRET env
// vars google-auth.ts already uses, since those are scoped for
// server-side Gmail/Calendar access, not public user sign-in.
// useSearchParams() needs a Suspense boundary around whatever reads it —
// this page is 100% "use client" already (no server-rendered content to
// lose), so the split below is purely to satisfy that requirement, not a
// meaningful architecture change.
export default function PlatformSignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [googlePending, setGooglePending] = useState(false);
  const searchParams = useSearchParams();
  // Carried from a specific pricing-card "Sign up" click
  // ((site)/platform/page.tsx) all the way through Google/magic-link auth
  // to the onboarding wizard's trial-vs-pay-now step — see
  // /api/platform/callback's own comment for the next leg of this relay.
  const plan = searchParams.get("plan");
  const callbackUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/platform/callback${plan ? `?plan=${plan}` : ""}`;

  async function signInWithGoogle() {
    setGooglePending(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    // On success the browser navigates away to Google immediately: this
    // only ever executes on failure, so it's safe to just re-enable the
    // button rather than needing a dedicated error state for it.
    if (error) setGooglePending(false);
  }

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl },
    });

    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-6">
      <Card className="w-full max-w-sm p-2">
        <CardContent>
          <Eyebrow>HamishAI Agency Platform</Eyebrow>
          <h1 className="mt-3 font-heading text-2xl font-semibold">Start your free trial</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            7 days free, no card required. First time here? You&apos;ll set up your agency straight after signing in.
          </p>

          <Button
            type="button"
            variant="outline"
            disabled={googlePending}
            onClick={signInWithGoogle}
            className="mt-6 h-10 w-full gap-2.5"
          >
            <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
              <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.1A11.99 11.99 0 0 0 12 24Z" />
              <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.26A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.26 5.38l4.01-3.1Z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.62l4.01 3.1C6.22 6.86 8.87 4.75 12 4.75Z" />
            </svg>
            {googlePending ? "Redirecting…" : "Continue with Google"}
          </Button>

          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {status === "sent" ? (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3.5 text-sm">
              <MailCheck className="mt-0.5 size-4 shrink-0 text-accent" />
              <p>Check your email for a sign-in link — it&apos;ll take you straight in.</p>
            </div>
          ) : (
            <form onSubmit={sendLink} className="mt-5 space-y-3">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@youragency.com"
                className="h-10"
              />
              <Button type="submit" variant="secondary" disabled={status === "sending"} className="h-10 w-full">
                {status === "sending" ? "Sending…" : "Email me a sign-in link instead"}
              </Button>
              {status === "error" && (
                <p className="text-sm text-destructive">Something went wrong — please try again.</p>
              )}
            </form>
          )}

          <p className="mt-5 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <a href="/terms" className="underline underline-offset-2 hover:text-foreground">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
