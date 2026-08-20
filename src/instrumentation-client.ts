import * as Sentry from "@sentry/nextjs";

// Client (browser) half of the Sentry setup — auto-loaded by Next.js's
// own client instrumentation hook, same as instrumentation.ts is for the
// server/edge half. Inert until NEXT_PUBLIC_SENTRY_DSN is set.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

// Required export for the SDK to instrument client-side route
// transitions (App Router navigations) — a no-op when Sentry.init()
// above never ran (no DSN set).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
