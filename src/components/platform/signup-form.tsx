"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, CheckCircle2, AlertCircle, ArrowRight, ExternalLink } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Eyebrow } from "@/components/eyebrow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_S = 30;

// Common webmail providers get a direct deep link ("Open Gmail" beats
// "check your email app" when it's knowable) — anything else falls back
// to the generic instruction rather than guessing wrong. Deliberately a
// short, maintained list, not an attempt at exhaustive domain coverage.
const WEBMAIL_LINKS: Record<string, { name: string; url: string }> = {
  "gmail.com": { name: "Gmail", url: "https://mail.google.com" },
  "outlook.com": { name: "Outlook", url: "https://outlook.live.com/mail" },
  "hotmail.com": { name: "Outlook", url: "https://outlook.live.com/mail" },
  "live.com": { name: "Outlook", url: "https://outlook.live.com/mail" },
  "yahoo.com": { name: "Yahoo Mail", url: "https://mail.yahoo.com" },
  "icloud.com": { name: "iCloud Mail", url: "https://www.icloud.com/mail" },
};

function webmailFor(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? WEBMAIL_LINKS[domain] : undefined;
}

// Three Facet-mark triangles pulsing in sequence — the same "tasteful,
// distinctly HamishAI, not a generic spinner" idea as
// signup-brand-panel.tsx's ambient motif, just small enough to sit
// inline in a button. Static (opacity 1, no stagger) under
// prefers-reduced-motion via the plain CSS media query below, rather
// than the .motif-anim class — that class assumes a background
// decoration safe to fully hide, this is the only loading indicator on
// an active button and needs to stay visible, just still.
function FacetSpinner() {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="facet-spinner-dot size-1.5 rotate-45 bg-current"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </span>
  );
}

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

  // Carried from a specific pricing-card "Sign up" click
  // ((site)/platform/page.tsx) all the way through Google/magic-link auth
  // to the onboarding wizard's trial-vs-pay-now step — see
  // /api/platform/callback's own comment for the next leg of this relay.
  const plan = searchParams.get("plan");
  const callbackUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/platform/callback${plan ? `?plan=${plan}` : ""}`;

  const emailValid = EMAIL_RE.test(email);
  const showEmailError = touched && email.length > 0 && !emailValid;

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

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
    setTouched(true);
    if (!emailValid || status === "sending") return;

    setStatus("sending");
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl },
    });

    if (error) {
      // Supabase's own rate-limit message is accurate but reads like a
      // server log, not a product — rewritten into the same voice as
      // everything else here rather than shown verbatim.
      const friendly = /security purposes|rate limit/i.test(error.message)
        ? "You've already requested a link recently — check your inbox, or wait a moment before trying again."
        : "Something went wrong sending that — please try again.";
      setErrorMessage(friendly);
      setStatus("error");
      return;
    }

    setStatus("sent");
    setCooldown(RESEND_COOLDOWN_S);
  }

  async function resend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl },
    });
    // Stays on the "check your inbox" screen either way — a resend
    // failing quietly and leaving the original link still valid is a
    // better failure mode here than bouncing back to the form.
    setResending(false);
    setCooldown(RESEND_COOLDOWN_S);
  }

  function changeEmail() {
    setStatus("idle");
    setErrorMessage(null);
    setTouched(false);
    setCooldown(0);
    setResending(false);
    // Sending focus back to the field is the accessible equivalent of
    // this being "step 1 again" for a keyboard/screen-reader user, not
    // just a visual reset.
    requestAnimationFrame(() => emailInputRef.current?.focus());
  }

  if (status === "sent") {
    const webmail = webmailFor(email);
    return (
      <div className="flex w-full max-w-sm flex-col items-center text-center" aria-live="polite">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Mail className="size-5" />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-semibold">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ve sent a sign-in link to <span className="font-medium text-foreground">{email}</span>
        </p>

        {webmail && (
          <Button className="mt-6 w-full" render={<a href={webmail.url} target="_blank" rel="noopener noreferrer" />}>
            Open {webmail.name}
            <ExternalLink className="size-3.5" />
          </Button>
        )}

        <Button variant="outline" className="mt-3 w-full" onClick={resend} disabled={cooldown > 0 || resending}>
          {resending ? "Sending…" : cooldown > 0 ? `Resend link in ${cooldown}s` : "Resend link"}
        </Button>

        <button
          type="button"
          onClick={changeEmail}
          className="mt-4 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Use a different email
        </button>

        <p className="mt-8 text-xs text-muted-foreground">Nothing in your inbox? Check spam, or resend in a moment.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <Eyebrow>HamishAI Agency Platform</Eyebrow>
      <h1 className="mt-3 font-heading text-2xl font-semibold">Sign in or create your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        New here or coming back — it&apos;s the same one step either way.
      </p>

      <Button
        type="button"
        disabled={googlePending}
        onClick={signInWithGoogle}
        className="mt-6 h-11 w-full gap-2.5 text-[0.925rem]"
      >
        {googlePending ? (
          <>
            <FacetSpinner />
            Redirecting to Google…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
              <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.1A11.99 11.99 0 0 0 12 24Z" />
              <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.26A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.26 5.38l4.01-3.1Z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.62l4.01 3.1C6.22 6.86 8.87 4.75 12 4.75Z" />
            </svg>
            Continue with Google
          </>
        )}
      </Button>

      <div className="mt-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or continue with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={sendLink} noValidate className="mt-5 space-y-1.5">
        <Label htmlFor="signup-email" className="sr-only">
          Email address
        </Label>
        <div className="relative">
          <Input
            id="signup-email"
            ref={emailInputRef}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="you@youragency.com"
            className="h-11 pr-9"
            aria-invalid={showEmailError}
            aria-describedby={showEmailError ? "signup-email-error" : undefined}
          />
          {touched && email.length > 0 && (
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
              {emailValid ? (
                <CheckCircle2 className="size-4 text-accent" aria-hidden="true" />
              ) : (
                <AlertCircle className="size-4 text-destructive" aria-hidden="true" />
              )}
            </span>
          )}
        </div>
        {showEmailError && (
          <p id="signup-email-error" className="text-xs text-destructive">
            Enter a valid email address.
          </p>
        )}

        <Button type="submit" variant="secondary" disabled={status === "sending" || (touched && !emailValid)} className="mt-3.5! h-11 w-full gap-1.5">
          {status === "sending" ? (
            <>
              <FacetSpinner />
              Sending your link…
            </>
          ) : (
            <>
              Continue with email
              <ArrowRight className="size-3.5" />
            </>
          )}
        </Button>

        <p className="pt-1 text-xs text-muted-foreground">
          Already have an account? Enter the same email — we&apos;ll sign you straight in.
        </p>

        {status === "error" && errorMessage && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        )}
      </form>

      <p className="mt-6 text-xs text-muted-foreground">
        Google sign-in only shares your name and email with HamishAI — never access to your Gmail or files. By
        continuing, you agree to our{" "}
        <a href="/terms" className="underline underline-offset-2 hover:text-foreground">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
