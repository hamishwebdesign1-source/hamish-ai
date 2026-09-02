import { ogImageResponse, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Portfolio | Hamish AI";

export default async function Image() {
  return ogImageResponse({
    eyebrow: "Portfolio",
    title: "Case studies, not just concepts.",
    // Found live, 2 Sep 2026, same bug as book/opengraph-image.tsx's own
    // fix: rendered entirely unhighlighted, since "studies" silently
    // failed to match title's own "studies," (comma attached). Fixed at
    // the root in og-image.tsx (trailing punctuation now stripped
    // before comparing), so this stays the natural, unpunctuated phrase.
    highlight: "Case studies",
  });
}
