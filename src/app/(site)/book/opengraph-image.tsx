import { ogImageResponse, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Book a consultation | Hamish AI";

export default async function Image() {
  return ogImageResponse({
    eyebrow: "Free consultation",
    title: "Pick a time. We'll take it from there.",
    // Found live, 2 Sep 2026: this rendered entirely unhighlighted —
    // og-image.tsx's own highlight matching used to do an exact
    // word-token comparison, so "time" silently failed to match
    // title's own "time." (period attached). Fixed at the root in
    // og-image.tsx itself (trailing punctuation now stripped before
    // comparing), so this stays the natural, unpunctuated phrase.
    highlight: "Pick a time",
  });
}
