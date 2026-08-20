import { PostHog } from "posthog-node";

// Platform readiness audit P1 — the last item on the list: zero product
// analytics existed anywhere (confirmed via search, not assumed), meaning
// no visibility into whether a real tenant ever actually activates,
// converts, or churns. PostHog over Vercel Analytics/GA: the audit's own
// framing (acquisition/activation/conversion/revenue/retention/churn) is
// about per-organisation lifecycle events, not aggregate page traffic —
// PostHog's identify+capture model fits that directly, autocapture alone
// wouldn't.
//
// Same hasXConfig()-and-fail-open pattern as every other optional
// integration in this app (tenant-graph-auth.ts, stripe-connect.ts) — no
// account exists yet, so this ships inert until NEXT_PUBLIC_POSTHOG_KEY
// is actually set, rather than blocking on that account being created
// first.
//
// A fresh client per call, shut down immediately after — Server Actions
// and route handlers run in a serverless function that can freeze the
// moment a response is sent, so an event captured without an explicit
// flush can simply never arrive. Not the highest-throughput pattern, but
// these are milestone events (a handful per organisation, not a
// per-request firehose), so correctness matters more than the overhead
// of one extra client per call.
export function hasAnalyticsConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

// distinctId is always the organisation id, never a personal email —
// every event this app actually fires is about an org's lifecycle
// (signed up, first discovery run, first conversion), not an individual
// user's browsing behaviour, so that's the right unit to track by.
export async function trackServerEvent(distinctId: string, event: string, properties?: Record<string, unknown>) {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return;

  const client = new PostHog(apiKey, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
  });

  try {
    client.capture({ distinctId, event, properties });
    await client.shutdown();
  } catch (error) {
    // Analytics failing should never break the actual feature it's
    // instrumenting — same fail-open rule as chat-rate-limit.ts's own DB
    // hiccup handling.
    console.error(`Failed to track analytics event "${event}":`, error);
  }
}
