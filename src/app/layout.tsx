import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Fraunces } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://hamishai.org"),
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
      className={`${dmSans.variable} ${plexMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  );
}
