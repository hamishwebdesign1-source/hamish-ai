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
