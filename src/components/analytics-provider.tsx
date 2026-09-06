"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// Client-side half of analytics.ts — pageview/session autocapture across
// the whole app (public site, Studio, portal), inert until
// NEXT_PUBLIC_POSTHOG_KEY is actually set. Initialised once on mount
// rather than at module scope, since this file is imported into the root
// layout and runs on every render otherwise.
//
// Deliberately no cookie-consent banner added alongside this — genuinely
// no cookies are set, first- or third-party, and no personal data is
// captured beyond what page was visited. If this ever grows into
// cross-site tracking or ad targeting, that's a real decision to revisit
// consent for, not something to bolt on quietly.
//
// Pre-launch audit (2026-09-06) caught a real gap in that reasoning: this
// comment used to claim PostHog's *default* config already avoids
// cookies, but posthog-js's own actual default is
// `persistence: "localStorage+cookie"` (confirmed by reading the
// installed SDK's source, not assumed) — it sets a real first-party
// cookie unless told not to. "Not third-party" and "no cookies" aren't
// the same claim, and only the first one was ever true. `persistence:
// "localStorage"` below makes the comment's own claim actually correct
// instead of quietly leaving a compliance gap under it.
export function AnalyticsProvider() {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!apiKey || posthog.__loaded) return;

    posthog.init(apiKey, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
      persistence: "localStorage",
    });
  }, []);

  return null;
}
