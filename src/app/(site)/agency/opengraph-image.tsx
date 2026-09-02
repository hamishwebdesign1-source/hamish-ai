import { ogImageResponse, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Hamish AI — Edinburgh's AI transformation partner for small businesses";

// SEO/GEO audit (2 Sep 2026) — this content used to live at the root
// (src/app/opengraph-image.tsx), back when "/" was this same consultancy
// pitch. Moved here verbatim, unchanged, when the homepage swapped to
// the Agency Platform pitch — same reasoning as this page's own
// `metadata` export (agency/page.tsx's own comment): the root default
// now describes the Platform instead, so anything that was genuinely
// this page's own content needs its own copy of what was there, not to
// silently inherit whatever the root now says.
export default async function Image() {
  return ogImageResponse({
    eyebrow: "Hamish AI · Edinburgh",
    title: "AI-powered digital solutions for small businesses.",
    highlight: "AI-powered",
  });
}
