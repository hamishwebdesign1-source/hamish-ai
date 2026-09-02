import type { MetadataRoute } from "next";

// SEO/branding audit (2 Sep 2026) — verified no manifest.json/webmanifest
// existed anywhere (no manifest.ts, no static file in public/). This is
// Android/Chrome's equivalent of apple-icon.tsx's own fix: without a
// manifest, "Add to Home Screen" on Android has no real icon or theme
// colour to use either. Next.js's manifest.ts file convention (same
// MetadataRoute family as sitemap.ts/robots.ts, already used throughout
// this codebase) generates a real manifest.webmanifest and wires up its
// <link rel="manifest"> tag automatically.
//
// Every value here is real, not invented for this file: name/description
// match the root layout's own metadata (layout.tsx) exactly; theme_color
// and background_color reuse icon.svg's own real dark background
// (#0b0f1a) rather than a new colour choice; the icon references the
// same real icon.svg already served sitewide (modern Chrome/Android
// accept an SVG with sizes: "any" directly, no new raster asset needed).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HamishAI Agency Platform — Launch Your Own AI Agency",
    short_name: "HamishAI",
    description:
      "The platform behind HamishAI, now yours to run your own agency on. Prospecting, AI analysis, outreach and client delivery, in one workspace.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f1a",
    theme_color: "#0b0f1a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
