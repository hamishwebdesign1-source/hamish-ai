import { ogImageResponse, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "HamishAI Agency Platform — the complete infrastructure for your own AI agency";

// SEO/GEO audit (2 Sep 2026) — this social-card image was still the old
// Edinburgh consultancy pitch ("Hamish AI · Edinburgh" / "AI-powered
// digital solutions for small businesses") long after the homepage
// itself swapped to the Agency Platform pitch. Verified live: sharing
// hamishai.org anywhere (Slack, LinkedIn, iMessage) showed this stale
// image, mismatched with both the page's own <title> and its real H1.
// The genuinely-still-accurate Edinburgh version moved to its own file
// at (site)/agency/opengraph-image.tsx, where that content actually
// lives now — this isn't a rewrite, it's the same fix (site)/page.tsx's
// own metadata and (site)/agency/page.tsx's own metadata already got
// when the homepage swap first shipped, just missed for this one asset.
// Eyebrow/title/highlight below are the homepage's own real copy
// verbatim ((site)/page.tsx's Eyebrow and <h1>), not written fresh for
// this card.
export default async function Image() {
  return ogImageResponse({
    eyebrow: "HamishAI Agency Platform",
    // No trailing period, unlike the real <h1> — ogImageResponse's
    // highlight matching (og-image.tsx) does an exact word-token
    // comparison against title.split(" "), so a highlighted phrase
    // landing on the sentence's last word would silently fail to match
    // against "agency." (period attached, no space) and render
    // unhighlighted with no error. Confirmed live before adding this
    // comment: the period version rendered "AI agency" in the same
    // plain ink as the rest of the title, not the intended accent blue.
    title: "The complete infrastructure for your own AI agency",
    highlight: "AI agency",
  });
}
