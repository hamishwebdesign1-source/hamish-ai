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
  title: "Hamish AI | Edinburgh's AI Transformation Partner for Small Businesses",
  // Rewritten 19 Aug 2026 — this is the meta description search engines
  // and social link previews actually show, so it's arguably the single
  // highest-stakes line of copy on the site: a stranger reads this before
  // they've clicked through to anything else. The old line ("unlock new
  // growth opportunities using practical AI solutions") was generic
  // AI-agency filler; this says the one concrete, unusual thing about the
  // offer instead — same fix as the homepage headline, same reasoning.
  description:
    "AI websites and automation for Edinburgh small businesses — see a free, working prototype before you pay anything. Plain English, no obligation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${plexMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  );
}
