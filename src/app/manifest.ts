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
// match the root layout's own metadata (layout.tsx) exactly; the icon
// references the same real icon.svg already served sitewide (modern
// Chrome/Android accept an SVG with sizes: "any" directly, no new
// raster asset needed).
//
// theme_color/background_color corrected 2 Sep 2026 — first shipped as
// #0b0f1a (icon.svg's own dark background), but that's the hero-only
// tone; the site's actual predominant background (About, Services,
// Contact, Portfolio, Terms, Privacy, AI Solutions, Analytics, Book,
// Website Audit — every page except the Home/Agency hero) is globals.css's
// light --background token, oklch(0.975 0.006 250). Converted precisely
// (OKLCH → sRGB) to #f4f7fb — independently confirmed correct: it's an
// exact match for og-image.tsx's own hand-picked BRAND.paper constant,
// arrived at completely separately.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HamishAI Agency Platform — Launch Your Own AI Agency",
    short_name: "HamishAI",
    description:
      "The platform behind HamishAI, now yours to run your own agency on. Prospecting, AI analysis, outreach and client delivery, in one workspace.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#f4f7fb",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
