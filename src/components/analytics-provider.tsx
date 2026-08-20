"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// Client-side half of analytics.ts — pageview/session autocapture across
// the whole app (public site, Studio, portal), inert until
// NEXT_PUBLIC_POSTHOG_KEY is actually set. Initialised once on mount
// rather than at module scope, since this file is imported into the root
// layout and runs on every render otherwise.
//
// Deliberately no cookie-consent banner added alongside this — PostHog's
// default config here uses localStorage, not third-party cookies, and
// captures no personal data beyond what page was visited. If this ever
// grows into cross-site tracking or ad targeting, that's a real decision
// to revisit consent for, not something to bolt on quietly.
export function AnalyticsProvider() {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!apiKey || posthog.__loaded) return;

    posthog.init(apiKey, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
    });
  }, []);

  return null;
}
