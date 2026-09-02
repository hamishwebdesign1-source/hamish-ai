import { ogImageResponse, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "HamishAI Agency Platform — the complete infrastructure for your own AI agency";

// SEO/GEO audit (2 Sep 2026) — real bug, not just stale copy: the
// homepage was the only (site) page with no dedicated opengraph-image.tsx
// of its own, relying on the root fallback (src/app/opengraph-image.tsx)
// instead — every sibling page (about, agency, ai-solutions, book,
// contact, portfolio, services) already has its own co-located file.
// Verified live that the fallback doesn't actually reach the homepage:
// og:image was completely absent from "/"'s rendered <head> (not just
// showing a stale image — no og:image or twitter:image meta tag at
// all), because (site)/layout.tsx sets its own `openGraph` object
// (type/siteName/locale, added earlier this same audit) with no
// `images` field, which shadows the root's file-convention image for
// every page under (site) that doesn't supply its own. Every other
// (site) page already had its own file for exactly this reason; the
// homepage was the one gap. Same fix, same pattern: a dedicated file in
// this page's own segment. Content is the homepage's own real copy
// verbatim ((site)/page.tsx's Eyebrow and <h1>).
export default async function Image() {
  return ogImageResponse({
    eyebrow: "HamishAI Agency Platform",
    // No trailing period, unlike the real <h1> — ogImageResponse's
    // highlight matching (og-image.tsx) does an exact word-token
    // comparison against title.split(" "), so a highlighted phrase
    // landing on the sentence's last word silently fails to match
    // "agency." (period attached, no space) and renders unhighlighted
    // with no error. Confirmed live before settling on this.
    title: "The complete infrastructure for your own AI agency",
    highlight: "AI agency",
  });
}
