import * as Sentry from "@sentry/nextjs";

// Server/edge half of the Sentry setup — P1 platform readiness item,
// replacing "check the daily email" (send-error-alert.ts's own
// self-check pattern, which only covers hamishai.org's own uptime/SSL,
// not real application exceptions anywhere in the app). Same
// hasXConfig()-and-fail-open pattern as every other optional integration
// (analytics.ts, stripe-connect.ts) — inert until SENTRY_DSN is actually
// set, no account exists yet.
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // Low sample rate — this is error visibility, not performance
    // profiling, and Sentry's free tier has a monthly event cap worth
    // conserving.
    tracesSampleRate: 0.1,
  });
}

export const onRequestError = Sentry.captureRequestError;
