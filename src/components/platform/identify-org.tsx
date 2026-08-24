"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// Bridges two currently-disconnected PostHog streams: analytics-provider.tsx's
// client-side autocapture (anonymous pageviews/clicks on the marketing site
// and /platform/signup, keyed by a device-local anonymous distinct_id) and
// analytics.ts's trackServerEvent() (org lifecycle milestones — signed up,
// subscribed, cancelled — deliberately keyed by organisation id, never a
// personal email, per that file's own comment). Without this, PostHog has
// no way to know the anonymous visitor who viewed /platform and clicked
// "Start free trial" is the same organisation that later shows up as
// org_signed_up — two unrelated identities, no funnel possible between them.
//
// posthog.identify() merges the browser's current anonymous distinct_id
// into the given id the first time it's called (PostHog's own alias
// mechanism), retroactively linking prior anonymous activity in this
// browser; every server event already uses the same org id, so once this
// runs, client and server events resolve to one person and a real
// marketing → signup → activation funnel becomes buildable in PostHog.
//
// Mounted in the (authed) Studio layout rather than only right after
// onboarding: that catches every path in (fresh signup, returning
// magic-link, Google sign-in on a new device), not just the first one.
// Calling it again on an already-identified id is a safe no-op — this is
// PostHog's own recommended pattern for a logged-in app, not a workaround.
export function IdentifyOrg({ orgId }: { orgId: string }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    posthog.identify(orgId);
  }, [orgId]);

  return null;
}
