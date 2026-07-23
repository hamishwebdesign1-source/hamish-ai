import { ogImageResponse, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Book a consultation | Hamish AI";

export default async function Image() {
  return ogImageResponse({
    eyebrow: "Free consultation",
    title: "Pick a time. We'll take it from there.",
    highlight: "Pick a time",
  });
}
