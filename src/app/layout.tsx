import type { Metadata, Viewport } from "next";
import { DM_Sans, IBM_Plex_Mono, Fraunces, Chakra_Petch, Sora } from "next/font/google";
import { AnalyticsProvider } from "@/components/analytics-provider";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

// Added alongside (not replacing) the fonts above — direct feedback
// asked for a more "futuristic, techy" typeface on the homepage, but
// Fraunces/DM Sans stay the sitewide default everywhere else (Studio's
// own product UI, /agency's consultancy pitch, /admin, /portal). /agency
// especially leans on a warm, plain-English, trustworthy-local-business
// voice that a sci-fi display face would actively undercut, so this is
// scoped, not global — see globals.css's own .platform-typography class
// for where it actually applies.
const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // SEO audit (2 Sep 2026) — was the apex ("https://hamishai.org"), which
  // 308-redirects to www at the DNS/hosting layer (Vercel's own domain
  // config, not a code redirect — confirmed live, every apex request
  // redirects, every www request is a direct 200). metadataBase resolves
  // every relative canonical URL sitewide, so every canonical tag was
  // pointing at a URL that immediately redirects rather than the final
  // destination — a real, if minor, signal to avoid per Google's own
  // guidance that canonical URLs should be reachable without a redirect.
  metadataBase: new URL("https://www.hamishai.org"),
  // Updated 2 Sep 2026 — the Agency Platform is now the homepage (see
  // (site)/page.tsx's own comment), so this root default — used as the
  // fallback for any page that somehow renders with no metadata of its
  // own — should describe that, not the archived Edinburgh homepage's
  // pitch (that page, /agency, now carries its own matching metadata
  // export instead). The homepage's own metadata export already
  // overrides this for "/" specifically; this mainly matters for
  // consistency (the root default and the actual homepage should agree)
  // and true edge cases.
  title: "HamishAI Agency Platform — Launch Your Own AI Agency",
  description:
    "The platform behind HamishAI, now yours to run your own agency on. Prospecting, AI analysis, outreach and client delivery, in one workspace.",
};

// SEO/branding audit (2 Sep 2026) — themeColor moved out of `metadata`
// into its own `viewport` export per Next.js's current App Router API
// (checked node_modules/next/dist/docs/.../generate-viewport.md before
// writing this, per this repo's own AGENTS.md — metadata.themeColor is
// the deprecated pre-Next-14 shape). Verified live: no
// <meta name="theme-color"> existed at all before this. Same real
// #f4f7fb as manifest.ts's own theme_color/background_color — see that
// file's comment for how it was derived (globals.css's real light
// --background token, converted precisely, independently confirmed
// against og-image.tsx's own hand-picked BRAND.paper constant).
export const viewport: Viewport = {
  themeColor: "#f4f7fb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      // SEO audit (2026-09-02) — was the generic "en"; the site's own
      // copy is consistently British English throughout ("colour",
      // "organisation", "optimisation") and og:locale ((site)/layout.tsx)
      // is now explicitly en_GB, so this was the one place still
      // under-specifying which. A real, if small, signal for screen
      // readers and search engines, not just decorative.
      lang="en-GB"
      className={`${dmSans.variable} ${plexMono.variable} ${fraunces.variable} ${chakraPetch.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  );
}
