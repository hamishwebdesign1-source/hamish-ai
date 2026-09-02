import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ],
  },
  // AI Website Creation Guide, WB8 — website-project-files.ts's real
  // browser file uploads go through a Server Action with the file in
  // FormData, and Next's own default Server Action body limit (1MB) is
  // too small for a real photo. 4.5mb, not a round number: matches
  // MAX_FILE_BYTES (4MB) in website-project-files.ts plus real headroom
  // for the rest of the multipart payload (filename, kind field,
  // boundaries), while staying under Vercel's own serverless function
  // request-body ceiling on the Hobby plan this app runs on (confirmed
  // earlier this session).
  experimental: {
    serverActions: {
      bodySizeLimit: "4.5mb",
    },
  },
  // 2 Sep 2026 — the Agency Platform marketing page moved from /platform
  // to / (it's the homepage now; the old homepage moved to /agency, see
  // (site)/page.tsx's own comment). Permanent redirect, not a deleted
  // route left to 404: /platform/signup, /platform/onboarding, and
  // /platform/callback are untouched (they live under src/app/platform/,
  // a different folder from the marketing page that was under
  // src/app/(site)/platform/) — this only redirects the bare marketing
  // URL, so any existing bookmark or backlink still lands on real,
  // correct content instead of a dead end.
  async redirects() {
    return [{ source: "/platform", destination: "/", permanent: true }];
  },
  // SEO/Lighthouse-Best-Practices audit (2 Sep 2026) — verified live via
  // curl that only Strict-Transport-Security was set (Vercel's own
  // default); X-Content-Type-Options and Referrer-Policy were both
  // absent. Both are checked by Lighthouse's Best Practices score, both
  // are zero-risk (they can't break any real feature — nosniff only
  // blocks MIME-type-confusion attacks, and this Referrer-Policy value
  // is already Chrome's own default behaviour, just not explicit here).
  // Deliberately NOT adding Permissions-Policy or Content-Security-Policy
  // in the same pass: Permissions-Policy would need auditing whether
  // Studio uses camera/microphone/geolocation anywhere before it's safe
  // to restrict site-wide, and CSP needs an exhaustive, verified allowlist
  // of every legitimate external source this app loads (Stripe, Sentry,
  // Google Fonts, Supabase, the embed widget, Pexels images) — getting
  // either wrong risks breaking a real feature, a worse outcome than the
  // header being absent.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

// withSentryConfig is safe to apply unconditionally — without SENTRY_ORG/
// SENTRY_PROJECT/SENTRY_AUTH_TOKEN set (no Sentry account exists yet),
// it just skips the source-map-upload step at build time rather than
// failing the build, same fail-open shape as instrumentation.ts's own
// SENTRY_DSN check.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
});
