import { ImageResponse } from "next/og";

// SEO/branding audit (2 Sep 2026) — verified live: the site only ever
// served icon.svg (an <link rel="icon"> SVG), no apple-touch-icon at
// all. iOS Safari's "Add to Home Screen" specifically looks for
// apple-touch-icon and does not fall back to a generic SVG icon —
// without one, a visitor adding the site to their home screen gets a
// blank/screenshot-based icon instead of the real logo. Next.js's
// apple-icon.tsx file convention (same ImageResponse mechanism already
// used for opengraph-image.tsx) auto-generates the route and the real
// <link rel="apple-touch-icon"> tag — no new artwork, this reproduces
// icon.svg's own real shapes/colours exactly (same polygon geometry as
// LogoMark, src/components/logo.tsx) at Apple's recommended 180x180.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0b0f1a",
          borderRadius: 39,
        }}
      >
        <svg width="180" height="180" viewBox="0 0 120 120">
          <polygon points="60,26 60,60 30,60" fill="#e7eaf2" fillOpacity="0.45" />
          <polygon points="60,26 90,60 60,60" fill="#e7eaf2" fillOpacity="0.85" />
          <polygon points="90,60 60,94 60,60" fill="#e7eaf2" fillOpacity="0.65" />
          <polygon points="60,60 60,94 30,60" fill="#8b6bea" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
